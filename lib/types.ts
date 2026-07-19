export type Category = 'new' | 'old' | 'single' | 'group';

export type Language = 'oromo' | 'english' | 'amharic' | 'sidama' | 'arabic';

export interface Artist {
  id: string;
  name: string;
  image_url: string | null;
  bio: string | null;
  is_group: boolean;
  category: Category;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist_id: string;
  artist?: Artist;
  audio_url: string;
  lyrics: string | null;
  image_url: string | null;
  track_number: number;
  category: Category;
  language: Language;
  duration: number | null;
  created_at: string;
}

export interface Playlist {
  id: string;
  name: string;
  user_id: string | null;
  songs?: Song[];
  created_at: string;
}

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}
