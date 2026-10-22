alter table public.student_profiles
  add column if not exists gender_identity text,
  add column if not exists gender_self_description text,
  add column if not exists meet_genders text[] not null default '{}',
  add column if not exists connection_interests text[] not null default '{}';

alter table public.student_profiles
  drop constraint if exists student_profiles_gender_identity_check,
  add constraint student_profiles_gender_identity_check
    check (gender_identity is null or gender_identity in (
      'woman',
      'man',
      'non_binary',
      'self_describe',
      'prefer_not_to_say'
    )),
  drop constraint if exists student_profiles_gender_description_check,
  add constraint student_profiles_gender_description_check
    check (
      (gender_identity = 'self_describe' and gender_self_description is not null
        and char_length(btrim(gender_self_description)) between 1 and 60)
      or (gender_identity is distinct from 'self_describe' and gender_self_description is null)
      or gender_identity is null
    ),
  drop constraint if exists student_profiles_meet_genders_check,
  add constraint student_profiles_meet_genders_check
    check (meet_genders <@ array['women', 'men', 'self_described_prefer_not']::text[]),
  drop constraint if exists student_profiles_connection_interests_check,
  add constraint student_profiles_connection_interests_check
    check (connection_interests <@ array['garba_partner', 'friendship', 'romantic']::text[]);

create table if not exists public.student_swipes (
  actor_id text not null references public.student_profiles(user_id) on delete cascade,
  target_id text not null references public.student_profiles(user_id) on delete cascade,
  action text not null check (action in ('like', 'pass')),
  created_at timestamptz not null default now(),
  constraint student_swipes_not_self check (actor_id <> target_id),
  constraint student_swipes_unique_pair unique (actor_id, target_id)
);

create table if not exists public.student_matches (
  id uuid primary key default gen_random_uuid(),
  user_low text not null references public.student_profiles(user_id) on delete cascade,
  user_high text not null references public.student_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint student_matches_canonical_pair check (user_low < user_high),
  constraint student_matches_unique_pair unique (user_low, user_high)
);

create index if not exists student_profiles_discovery_order_idx
  on public.student_profiles (updated_at desc, user_id)
  where gender_identity is not null
    and cardinality(meet_genders) > 0
    and cardinality(connection_interests) > 0;

alter table public.student_swipes enable row level security;
alter table public.student_matches enable row level security;

revoke all on public.student_swipes, public.student_matches from anon, authenticated;
grant all on public.student_swipes, public.student_matches to service_role;

create schema if not exists matching_private;
revoke all on schema matching_private from public, anon, authenticated;

create or replace function matching_private.gender_bucket(p_identity text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_identity
    when 'woman' then 'women'
    when 'man' then 'men'
    when 'non_binary' then 'self_described_prefer_not'
    when 'self_describe' then 'self_described_prefer_not'
    when 'prefer_not_to_say' then 'self_described_prefer_not'
    else null
  end;
$$;

create or replace function matching_private.users_are_compatible(p_user_a text, p_user_b text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_profiles a
    join public.student_profiles b on b.user_id = p_user_b
    where a.user_id = p_user_a
      and a.user_id <> b.user_id
      and a.gender_identity is not null
      and b.gender_identity is not null
      and cardinality(a.meet_genders) > 0
      and cardinality(b.meet_genders) > 0
      and cardinality(a.connection_interests) > 0
      and cardinality(b.connection_interests) > 0
      and matching_private.gender_bucket(b.gender_identity) = any(a.meet_genders)
      and matching_private.gender_bucket(a.gender_identity) = any(b.meet_genders)
  );
$$;

create or replace function public.get_discovery_candidates(p_actor_id text)
returns table (
  user_id text,
  display_name text,
  branch text,
  academic_year text,
  photo_paths text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.display_name, p.branch, p.academic_year, p.photo_paths
  from public.student_profiles p
  where p.user_id <> p_actor_id
    and matching_private.users_are_compatible(p_actor_id, p.user_id)
    and not exists (
      select 1 from public.student_swipes s
      where s.actor_id = p_actor_id and s.target_id = p.user_id
    )
    and not exists (
      select 1 from public.student_matches m
      where (m.user_low = p_actor_id and m.user_high = p.user_id)
         or (m.user_low = p.user_id and m.user_high = p_actor_id)
    )
  order by p.updated_at desc, p.user_id
  limit 1;
$$;

create or replace function public.record_student_swipe(
  p_actor_id text,
  p_target_id text,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_low text;
  v_high text;
begin
  if p_actor_id is null or p_target_id is null then
    raise exception 'invalid_user_id' using errcode = '22023';
  end if;
  if p_action is null or p_action not in ('like', 'pass') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if p_actor_id = p_target_id then
    raise exception 'cannot_swipe_self' using errcode = '22023';
  end if;

  v_low := least(p_actor_id, p_target_id);
  v_high := greatest(p_actor_id, p_target_id);
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_low, 0));
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_high, 0));
  if not matching_private.users_are_compatible(p_actor_id, p_target_id) then
    raise exception 'profiles_not_compatible' using errcode = '22023';
  end if;

  insert into public.student_swipes (actor_id, target_id, action)
  values (p_actor_id, p_target_id, p_action)
  on conflict (actor_id, target_id) do nothing;

  if p_action <> 'like' or not exists (
    select 1 from public.student_swipes
    where actor_id = p_target_id and target_id = p_actor_id and action = 'like'
  ) or not matching_private.users_are_compatible(p_actor_id, p_target_id) then
    return false;
  end if;

  insert into public.student_matches (user_low, user_high)
  values (v_low, v_high)
  on conflict (user_low, user_high) do nothing;

  return true;
end;
$$;

create or replace function public.save_matching_preferences(
  p_actor_id text,
  p_gender_identity text,
  p_gender_self_description text,
  p_meet_genders text[],
  p_connection_interests text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pair record;
  v_user_id text;
begin
  for v_user_id in
    select distinct users.user_id
    from (
      select p_actor_id as user_id
      union
      select s.actor_id from public.student_swipes s
      where s.target_id = p_actor_id and s.action = 'like'
      union
      select s.target_id from public.student_swipes s
      where s.actor_id = p_actor_id and s.action = 'like'
    ) users
    order by users.user_id
  loop
    perform pg_advisory_xact_lock(hashtextextended('user:' || v_user_id, 0));
  end loop;

  if p_gender_identity is null
    or p_gender_identity not in ('woman', 'man', 'non_binary', 'self_describe', 'prefer_not_to_say') then
    raise exception 'invalid_gender_identity' using errcode = '22023';
  end if;
  if p_gender_identity = 'self_describe'
    and (p_gender_self_description is null
      or char_length(btrim(p_gender_self_description)) not between 1 and 60) then
    raise exception 'invalid_gender_description' using errcode = '22023';
  end if;
  if p_gender_identity <> 'self_describe' and p_gender_self_description is not null then
    raise exception 'unexpected_gender_description' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_meet_genders), 0) = 0
    or not (p_meet_genders <@ array['women', 'men', 'self_described_prefer_not']::text[])
    or cardinality(p_meet_genders) <> (
      select count(distinct value) from unnest(p_meet_genders) as selected(value)
    ) then
    raise exception 'invalid_meet_genders' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_connection_interests), 0) = 0
    or not (p_connection_interests <@ array['garba_partner', 'friendship', 'romantic']::text[])
    or cardinality(p_connection_interests) <> (
      select count(distinct value) from unnest(p_connection_interests) as selected(value)
    ) then
    raise exception 'invalid_connection_interests' using errcode = '22023';
  end if;

  update public.student_profiles
  set gender_identity = p_gender_identity,
      gender_self_description = case
        when p_gender_identity = 'self_describe' then btrim(p_gender_self_description)
        else null
      end,
      meet_genders = p_meet_genders,
      connection_interests = p_connection_interests,
      updated_at = now()
  where user_id = p_actor_id;

  if not found then
    raise exception 'profile_required' using errcode = 'P0002';
  end if;

  for v_pair in
    select distinct least(s.target_id, p_actor_id) as user_low,
           greatest(s.target_id, p_actor_id) as user_high
    from public.student_swipes s
    where (s.actor_id = p_actor_id or s.target_id = p_actor_id)
      and exists (
        select 1 from public.student_swipes reverse
        where reverse.actor_id = s.target_id
          and reverse.target_id = s.actor_id
          and s.action = 'like'
          and reverse.action = 'like'
      )
  loop
    if matching_private.users_are_compatible(v_pair.user_low, v_pair.user_high) then
      insert into public.student_matches (user_low, user_high)
      values (v_pair.user_low, v_pair.user_high)
      on conflict (user_low, user_high) do nothing;
    else
      delete from public.student_matches
      where user_low = v_pair.user_low and user_high = v_pair.user_high;
    end if;
  end loop;
end;
$$;

create or replace function public.get_student_matches(p_actor_id text)
returns table (
  other_user_id text,
  display_name text,
  branch text,
  academic_year text,
  photo_paths text[],
  connection_interests text[],
  matched_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.display_name, p.branch, p.academic_year, p.photo_paths,
         p.connection_interests, m.created_at
  from public.student_matches m
  join public.student_profiles p
    on p.user_id = case when m.user_low = p_actor_id then m.user_high else m.user_low end
  where m.user_low = p_actor_id or m.user_high = p_actor_id
  order by m.created_at desc;
$$;

revoke all on function public.get_discovery_candidates(text) from public, anon, authenticated;
revoke all on function public.record_student_swipe(text, text, text) from public, anon, authenticated;
revoke all on function public.save_matching_preferences(text, text, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.get_student_matches(text) from public, anon, authenticated;
grant execute on function public.get_discovery_candidates(text) to service_role;
grant execute on function public.record_student_swipe(text, text, text) to service_role;
grant execute on function public.save_matching_preferences(text, text, text, text[], text[]) to service_role;
grant execute on function public.get_student_matches(text) to service_role;
