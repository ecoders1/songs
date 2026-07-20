-- ═══════════════════════════════════════════════════════════════════════════
-- Faarfannaa Afaan Oromo — Supabase Schema
-- Safe to re-run in Supabase SQL Editor at any time (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists artists (
  id         uuid default uuid_generate_v4() primary key,
  name       text not null,
  image_url  text,
  bio        text,
  is_group   boolean default false,
  category   text check (category in ('new', 'old', 'single', 'group')) not null default 'single',
  created_at timestamp with time zone default now()
);

create table if not exists songs (
  id           uuid default uuid_generate_v4() primary key,
  title        text not null,
  artist_id    uuid references artists(id) on delete cascade,
  audio_url    text not null,
  lyrics       text,
  image_url    text,
  track_number integer default 1,
  category     text check (category in ('new', 'old', 'single', 'group')) not null default 'new',
  language     text check (language in ('oromo', 'english', 'amharic', 'sidama', 'arabic')) not null default 'oromo',
  duration     integer, -- seconds
  created_at   timestamp with time zone default now()
);

create table if not exists playlists (
  id         uuid default uuid_generate_v4() primary key,
  name       text not null,
  user_id    text,
  created_at timestamp with time zone default now()
);

create table if not exists playlist_songs (
  id          uuid default uuid_generate_v4() primary key,
  playlist_id uuid references playlists(id) on delete cascade,
  song_id     uuid references songs(id) on delete cascade,
  position    integer default 0,
  created_at  timestamp with time zone default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists songs_artist_id_idx         on songs(artist_id);
create index if not exists songs_category_idx          on songs(category);
create index if not exists songs_language_idx          on songs(language);
create index if not exists artists_category_idx        on artists(category);
create index if not exists artists_name_idx            on artists(name);
create index if not exists playlist_songs_playlist_idx on playlist_songs(playlist_id);

-- ─── Storage buckets ─────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio',  'audio',  true, 52428800,
   array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/m4a','audio/aac','audio/flac']),
  ('images', 'images', true, 10485760,
   array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do nothing;

-- ─── Storage policies ────────────────────────────────────────────────────────

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

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table artists        enable row level security;
alter table songs          enable row level security;
alter table playlists      enable row level security;
alter table playlist_songs enable row level security;

drop policy if exists "Public read artists"        on artists;
drop policy if exists "Public read songs"          on songs;
drop policy if exists "Public read playlists"      on playlists;
drop policy if exists "Public read playlist_songs" on playlist_songs;

create policy "Public read artists"        on artists        for select using (true);
create policy "Public read songs"          on songs          for select using (true);
create policy "Public read playlists"      on playlists      for select using (true);
create policy "Public read playlist_songs" on playlist_songs for select using (true);

-- ─── Seed: Artists ───────────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING — safe to re-run without touching existing rows.
--
-- Categories:
--   new    = New Songs
--   single = Single Songs
--   old    = Old Songs
--   group  = Group / Choir

INSERT INTO artists (id, name, bio, is_group, category) VALUES

  -- ── New Songs ──────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000003', 'Gedion Dabalaa',  'Faarfataa Afaan Oromoo',                false, 'new'),
  ('00000000-0000-0000-0000-000000000010', 'Tiyyaa Ababaa',   'Faarfataa Afaan Oromoo',                false, 'new'),
  ('3501350b-56ab-43ea-ac38-45e82de96aef', 'Tsegaw Tilahun',  'Faarfataa Afaan Oromoo',                false, 'new'),

  -- ── Single Songs ───────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000001', 'Efrem Mulgeta',   'Faarfataa Afaan Oromoo beekamaa',       false, 'single'),
  ('00000000-0000-0000-0000-000000000011', 'Didha Benya',     'Faarfataa Afaan Oromoo',                false, 'single'),
  ('00000000-0000-0000-0000-000000000012', 'Bishop Kumesa',   'Faarfataa fi qondaala amantii',         false, 'single'),
  ('dfbfd99b-da0c-495d-8702-61049fab842f', 'Henok Tesfaye',   'Faarfataa Afaan Oromoo',                false, 'single'),

  -- ── Old Songs ──────────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000013', 'Addissuu Tadalaa', 'Faarfataa Afaan Oromoo durii',         false, 'old'),
  ('00000000-0000-0000-0000-000000000014', 'Ashu Adola',       'Faarfataa Afaan Oromoo durii',         false, 'old'),
  ('00000000-0000-0000-0000-000000000015', 'Lookoo',           'Faarfataa Afaan Oromoo durii',         false, 'old'),
  ('83d3ace2-6f62-4240-bd73-8bfe6b04231f', 'Asaafa Culuuqqe',  'Faarfataa Afaan Oromoo durii',        false, 'old'),

  -- ── Group / Choir ──────────────────────────────────────────────────────────
  ('00000000-0000-0000-0000-000000000002', 'Group Faarfannaa', 'Garee faarfannaa waldaa',              true,  'group'),
  ('00000000-0000-0000-0000-000000000004', 'Choir Apostolic',  'Garee faarfannaa Apostolic',           true,  'group'),
  ('f602c2a3-1ff0-4927-ac7e-3f93ecd59b68', 'Addaa Hinbaanu',   'Garee faarfannaa Afaan Oromoo',       true,  'group')

ON CONFLICT (id) DO NOTHING;

-- ─── Seed: Placeholder songs ─────────────────────────────────────────────────
-- Only for artists that don't have real uploads yet.
-- Artists that already have real songs uploaded via the upload scripts
-- are NOT listed here — their songs are already in the DB.
--
-- Covered by upload scripts (already have real songs):
--   Gedion Dabalaa      → upload-gedion-songs.js
--   Tiyyaa Ababaa       → upload-tiyyaa-songs.js
--   Tsegaw Tilahun      → upload-tsegaw-songs.js
--   Efrem Mulgeta       → upload-efrem-songs.js
--   Didha Benya         → upload-didha-songs.js
--   Bishop Kumesa       → upload-bishop-songs.js
--   Henok Tesfaye       → upload-henok-songs.js
--   Addissuu Tadalaa    → upload-addisuu-taddalaa-songs.js
--   Ashu Adola          → upload-ashu-adola-songs.js
--   Lookoo              → upload-lookoo-songs.js
--
-- Still need songs uploaded:
--   Asaafa Culuuqqe     (old)
--   Addaa Hinbaanu      (group)
--   Group Faarfannaa    (group)
--   Choir Apostolic     (group)

INSERT INTO songs (id, title, artist_id, audio_url, track_number, category, language) VALUES

  -- Asaafa Culuuqqe — placeholder until audio is uploaded
  ('20000000-0000-0000-0000-000000000001', 'Faarfannaa Asaafa 1',
   '83d3ace2-6f62-4240-bd73-8bfe6b04231f',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 1, 'old', 'oromo'),

  -- Addaa Hinbaanu — placeholder until audio is uploaded
  ('20000000-0000-0000-0000-000000000002', 'Faarfannaa Addaa 1',
   'f602c2a3-1ff0-4927-ac7e-3f93ecd59b68',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 1, 'group', 'oromo'),

  -- Group Faarfannaa — placeholder
  ('10000000-0000-0000-0000-000000000003', 'Faarsaa Garee 1',
   '00000000-0000-0000-0000-000000000002',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 1, 'group', 'oromo'),

  -- Choir Apostolic — placeholder
  ('10000000-0000-0000-0000-000000000006', 'Choir Song 1',
   '00000000-0000-0000-0000-000000000004',
   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 1, 'group', 'oromo')

ON CONFLICT (id) DO NOTHING;
