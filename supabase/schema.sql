-- Apostolic Songs Afaan Oromoo - Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Users table (for app sign-up / sign-in) ─────────────────────────────────
create table if not exists app_users (
  id            uuid default uuid_generate_v4() primary key,
  full_name     text not null,
  email         text not null unique,
  password_hash text not null,
  device_id     text not null unique,  -- one device per account
  status        text check (status in ('pending', 'approved', 'rejected')) not null default 'pending',
  registration_ip text,                -- track IP to prevent multi-account abuse
  created_at    timestamp with time zone default now(),
  approved_at   timestamp with time zone,
  rejected_at   timestamp with time zone,
  reset_at      timestamp with time zone
);

create index if not exists app_users_email_idx     on app_users(email);
create index if not exists app_users_device_id_idx on app_users(device_id);
create index if not exists app_users_status_idx    on app_users(status);

-- Add registration_ip column if it doesn't exist (safe migration)
alter table app_users add column if not exists registration_ip text;

-- Artists / Groups table
create table if not exists artists (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  image_url text,
  bio text,
  is_group boolean default false,
  category text check (category in ('new', 'old', 'single', 'group')) not null default 'single',
  created_at timestamp with time zone default now()
);

-- Songs table
create table if not exists songs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  artist_id uuid references artists(id) on delete cascade,
  audio_url text not null,
  lyrics text,
  image_url text,
  track_number integer default 1,
  category text check (category in ('new', 'old', 'single', 'group')) not null default 'new',
  language text check (language in ('oromo', 'english', 'amharic', 'sidama', 'arabic')) not null default 'oromo',
  duration integer, -- in seconds
  created_at timestamp with time zone default now()
);

-- Playlists table
create table if not exists playlists (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  user_id text,
  created_at timestamp with time zone default now()
);

-- Playlist songs junction table
create table if not exists playlist_songs (
  id uuid default uuid_generate_v4() primary key,
  playlist_id uuid references playlists(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  position integer default 0,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists songs_artist_id_idx on songs(artist_id);
create index if not exists songs_category_idx on songs(category);
create index if not exists songs_language_idx on songs(language);
create index if not exists artists_category_idx on artists(category);
create index if not exists playlist_songs_playlist_id_idx on playlist_songs(playlist_id);

-- Storage buckets (safe to re-run, skips if already exists)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio',  'audio',  true, 52428800, array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/m4a','audio/aac','audio/flac']),
  ('images', 'images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do nothing;

-- Storage bucket policies (drop first so re-runs don't fail)
drop policy if exists "Public read audio"          on storage.objects;
drop policy if exists "Public read images"         on storage.objects;
drop policy if exists "Service role upload audio"  on storage.objects;
drop policy if exists "Service role upload images" on storage.objects;
drop policy if exists "Service role delete audio"  on storage.objects;
drop policy if exists "Service role delete images" on storage.objects;

create policy "Public read audio"          on storage.objects for select using (bucket_id = 'audio');
create policy "Public read images"         on storage.objects for select using (bucket_id = 'images');
create policy "Service role upload audio"  on storage.objects for insert with check (bucket_id = 'audio');
create policy "Service role upload images" on storage.objects for insert with check (bucket_id = 'images');
create policy "Service role delete audio"  on storage.objects for delete using (bucket_id = 'audio');
create policy "Service role delete images" on storage.objects for delete using (bucket_id = 'images');

-- Row Level Security
alter table artists        enable row level security;
alter table songs          enable row level security;
alter table playlists      enable row level security;
alter table playlist_songs enable row level security;
alter table app_users      enable row level security;

-- Table policies (drop first so re-runs don't fail)
drop policy if exists "Public read artists"        on artists;
drop policy if exists "Public read songs"          on songs;
drop policy if exists "Public read playlists"      on playlists;
drop policy if exists "Public read playlist_songs" on playlist_songs;

create policy "Public read artists"        on artists        for select using (true);
create policy "Public read songs"          on songs          for select using (true);
create policy "Public read playlists"      on playlists      for select using (true);
create policy "Public read playlist_songs" on playlist_songs for select using (true);

-- app_users: no public reads — all access via service role through API
-- Service role has full bypass of RLS, so no additional policies needed for writes.
-- Full access via service role (admin operations go through API with service key)

-- ─── Seed demo data (safe to re-run — uses ON CONFLICT DO NOTHING) ────────────
-- Creates sample artists and songs so the app has content immediately.
-- Replace audio_url values with your real Supabase storage URLs after uploading.

INSERT INTO artists (id, name, bio, is_group, category) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Henok Mulgeta', 'Faarfataa Afaan Oromoo beekamaa', false, 'single'),
  ('00000000-0000-0000-0000-000000000002', 'Group Faarfannaa', 'Garee faarfannaa waldaa', true, 'group'),
  ('00000000-0000-0000-0000-000000000003', 'Elemoo Hora', 'Faarfataa', false, 'new'),
  ('00000000-0000-0000-0000-000000000004', 'Choir Apostolic', 'Garee faarfannaa Apostolic', true, 'group')
ON CONFLICT (id) DO NOTHING;

INSERT INTO songs (id, title, artist_id, audio_url, track_number, category, language, duration) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Faarfannaa 1', '00000000-0000-0000-0000-000000000001',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 1, 'new', 'oromo', 180),
  ('10000000-0000-0000-0000-000000000002', 'Faarfannaa 2', '00000000-0000-0000-0000-000000000001',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 2, 'new', 'oromo', 210),
  ('10000000-0000-0000-0000-000000000003', 'Faarsaa Garee 1', '00000000-0000-0000-0000-000000000002',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 1, 'group', 'oromo', 195),
  ('10000000-0000-0000-0000-000000000004', 'Faarsaa Haaraa', '00000000-0000-0000-0000-000000000003',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 1, 'new', 'oromo', 220),
  ('10000000-0000-0000-0000-000000000005', 'Faarfannaa Durii', '00000000-0000-0000-0000-000000000001',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 3, 'old', 'oromo', 175),
  ('10000000-0000-0000-0000-000000000006', 'Choir Song 1', '00000000-0000-0000-0000-000000000004',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 1, 'group', 'oromo', 200)
ON CONFLICT (id) DO NOTHING;
