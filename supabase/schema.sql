-- Apostolic Songs Afaan Oromoo - Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

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

-- Storage buckets (run in Supabase dashboard > Storage)
-- Create bucket: "audio" (public)
-- Create bucket: "images" (public)

-- Row Level Security
alter table artists enable row level security;
alter table songs enable row level security;
alter table playlists enable row level security;
alter table playlist_songs enable row level security;

-- Public read access for all
create policy "Public read artists" on artists for select using (true);
create policy "Public read songs" on songs for select using (true);
create policy "Public read playlists" on playlists for select using (true);
create policy "Public read playlist_songs" on playlist_songs for select using (true);

-- Full access via service role (admin operations go through API with service key)
