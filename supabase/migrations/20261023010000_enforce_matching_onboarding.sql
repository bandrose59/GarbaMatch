alter table public.student_profiles
  add column if not exists onboarding_completed_at timestamptz;

alter table public.student_profiles
  drop constraint if exists student_profiles_connection_interests_check;

update public.student_profiles
set connection_interests = array_remove(
  array_replace(coalesce(connection_interests, '{}'), 'friendship', 'friends'),
  'romantic'
)
where connection_interests && array['friendship', 'romantic']::text[];

update public.student_profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, now())
where onboarding_completed_at is null
  and gender_identity in ('woman', 'man', 'non_binary', 'self_describe', 'prefer_not_to_say')
  and (gender_identity <> 'self_describe'
    or char_length(btrim(coalesce(gender_self_description, ''))) between 1 and 60)
  and cardinality(meet_genders) > 0
  and meet_genders <@ array['women', 'men', 'self_described_prefer_not']::text[]
  and cardinality(connection_interests) > 0
  and connection_interests <@ array['garba_partner', 'friends']::text[];

alter table public.student_profiles
  add constraint student_profiles_connection_interests_check
  check (connection_interests <@ array['garba_partner', 'friends']::text[]);

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
      and a.onboarding_completed_at is not null
      and b.onboarding_completed_at is not null
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
  if p_actor_id is null then
    raise exception 'invalid_user_id' using errcode = '22023';
  end if;

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
    or not (p_connection_interests <@ array['garba_partner', 'friends']::text[])
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
      onboarding_completed_at = now(),
      updated_at = now()
  where user_id = p_actor_id
    and char_length(btrim(display_name)) > 0
    and char_length(btrim(branch)) > 0
    and char_length(btrim(academic_year)) > 0;

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

drop function if exists public.get_student_matches(text);

create function public.get_student_matches(p_actor_id text)
returns table (
  other_user_id text,
  display_name text,
  branch text,
  academic_year text,
  photo_paths text[],
  instagram_username text,
  connection_interests text[],
  matched_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.display_name, p.branch, p.academic_year, p.photo_paths,
         p.instagram_username, p.connection_interests, m.created_at
  from public.student_matches m
  join public.student_profiles p
    on p.user_id = case when m.user_low = p_actor_id then m.user_high else m.user_low end
  where p_actor_id is not null
    and (m.user_low = p_actor_id or m.user_high = p_actor_id)
  order by m.created_at desc;
$$;

revoke all on function public.save_matching_preferences(text, text, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.get_student_matches(text) from public, anon, authenticated;
grant execute on function public.save_matching_preferences(text, text, text, text[], text[]) to service_role;
grant execute on function public.get_student_matches(text) to service_role;
