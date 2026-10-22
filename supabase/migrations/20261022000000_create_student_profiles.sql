create table if not exists public.student_profiles (
  user_id text primary key,
  display_name text not null check (char_length(display_name) between 1 and 80),
  branch text not null check (char_length(branch) between 1 and 100),
  academic_year text not null check (char_length(academic_year) between 1 and 40),
  instagram_username text check (
    instagram_username is null
    or instagram_username ~ '^[A-Za-z0-9._]{1,30}$'
  ),
  photo_paths text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint student_profiles_max_two_photos check (cardinality(photo_paths) <= 2)
);

alter table public.student_profiles enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
