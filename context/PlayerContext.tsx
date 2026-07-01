'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { Song, Artist } from '@/lib/types';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME    = 'faarfannaa-db';
const DB_VERSION = 2;  // bumped — added 'songsByArtist' store

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('songs'))    db.createObjectStore('songs',    { keyPath: 'id' });
      if (!db.objectStoreNames.contains('artists'))  db.createObjectStore('artists',  { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta'))     db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveToIDB<T extends { id: string }>(store: string, items: T[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readwrite');
    const s  = tx.objectStore(store);
    for (const item of items) s.put(item);
    return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  } catch { /* IDB not available */ }
}

export async function loadFromIDB<T>(store: string): Promise<T[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readonly');
    const s  = tx.objectStore(store);
    return new Promise((res, rej) => {
      const req = s.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror   = () => rej(req.error);
    });
  } catch { return []; }
}

// ─── Context types ────────────────────────────────────────────────────────────
interface PlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isOffline: boolean;
  cachedSongIds: Set<string>;
  offlineSongs: Song[];
  offlineArtists: Artist[];
  playSong: (song: Song, queue?: Song[]) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;
  downloadSong: (song: Song) => Promise<void>;
  /** Cache song data + audio files.  Pass songs=[] to only cache artists. */
  cacheAllSongs: (songs: Song[], artists?: Artist[]) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong,  setCurrentSong]  = useState<Song | null>(null);
  const [queue,        setQueue]        = useState<Song[]>([]);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolumeState]  = useState(1);
  const [isOffline,    setIsOffline]    = useState(false);
  const [cachedSongIds, setCachedSongIds] = useState<Set<string>>(new Set());
  const [offlineSongs,  setOfflineSongs]  = useState<Song[]>([]);
  const [offlineArtists, setOfflineArtists] = useState<Artist[]>([]);

  // ── Online/offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  // ── Load IDB on startup ───────────────────────────────────────────────────
  useEffect(() => {
    loadFromIDB<Song>('songs').then((s) => { if (s.length) setOfflineSongs(s); });
    loadFromIDB<Artist>('artists').then((a) => { if (a.length) setOfflineArtists(a); });

    try {
      const savedSong   = sessionStorage.getItem('currentSong');
      const savedVolume = sessionStorage.getItem('volume');
      if (savedSong)   setCurrentSong(JSON.parse(savedSong));
      if (savedVolume) setVolumeState(parseFloat(savedVolume));
    } catch { /* ignore */ }
  }, []);

  // ── Persist current song & volume ─────────────────────────────────────────
  useEffect(() => {
    if (currentSong) try { sessionStorage.setItem('currentSong', JSON.stringify(currentSong)); } catch { /* */ }
  }, [currentSong]);

  useEffect(() => {
    try { sessionStorage.setItem('volume', String(volume)); } catch { /* */ }
  }, [volume]);

  // ── Audio element ─────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate',     () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(audio.duration || 0));
    audio.addEventListener('ended', () => {
      setQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          setCurrentSong(next);
          audio.src = next.audio_url;
          audio.play().catch(() => {});
          setIsPlaying(true);
          return rest;
        }
        setIsPlaying(false);
        return prev;
      });
    });

    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // ── SW messaging ─────────────────────────────────────────────────────────
  const sendToSW = useCallback((msg: object) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller)
      navigator.serviceWorker.controller.postMessage(msg);
  }, []);

  // ── Playback ─────────────────────────────────────────────────────────────
  const playSong = useCallback((song: Song, newQueue: Song[] = []) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentSong(song);
    setQueue(newQueue.filter((s) => s.id !== song.id));
    audio.src = song.audio_url;
    audio.play().catch(() => {});
    setIsPlaying(true);
    // Cache this song immediately when played
    sendToSW({ type: 'CACHE_AUDIO', url: song.audio_url });
  }, [sendToSW]);

  const pauseSong  = useCallback(() => { audioRef.current?.pause(); setIsPlaying(false); }, []);
  const resumeSong = useCallback(() => { audioRef.current?.play().catch(() => {}); setIsPlaying(true); }, []);

  const nextSong = useCallback(() => {
    setQueue((prev) => {
      if (!prev.length) return prev;
      const [next, ...rest] = prev;
      setCurrentSong(next);
      const audio = audioRef.current;
      if (audio) { audio.src = next.audio_url; audio.play().catch(() => {}); }
      setIsPlaying(true);
      sendToSW({ type: 'CACHE_AUDIO', url: next.audio_url });
      return rest;
    });
  }, [sendToSW]);

  const prevSong = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { if (audio.currentTime > 3) audio.currentTime = 0; }
  }, []);

  const seekTo    = useCallback((t: number)   => { if (audioRef.current) audioRef.current.currentTime = t; }, []);
  const setVolume = useCallback((vol: number) => { if (audioRef.current) audioRef.current.volume = vol; setVolumeState(vol); }, []);
  const addToQueue = useCallback((song: Song)  => setQueue((p) => [...p, song]), []);
  const clearQueue = useCallback(()            => setQueue([]), []);

  // ── Download a single song to offline cache ───────────────────────────────
  const downloadSong = useCallback(async (song: Song) => {
    try {
      sendToSW({ type: 'CACHE_AUDIO', url: song.audio_url });
      if ('caches' in window) {
        const cache    = await caches.open('faarfannaa-audio');
        const existing = await cache.match(song.audio_url);
        if (!existing) {
          const r = await fetch(song.audio_url);
          if (r.ok) await cache.put(song.audio_url, r);
        }
        setCachedSongIds((prev) => new Set([...prev, song.id]));
      }
    } catch { /* silent */ }
  }, [sendToSW]);

  // ── Cache ALL songs + persist to IDB ─────────────────────────────────────
  const cacheAllSongs = useCallback((songs: Song[], artists: Artist[] = []) => {
    if (artists.length) {
      saveToIDB('artists', artists).catch(() => {});
      setOfflineArtists(artists);
    }

    if (!songs.length) return;

    // 1. Persist song metadata to IDB so artist page works fully offline
    saveToIDB('songs', songs).catch(() => {});
    setOfflineSongs(songs);

    // 2. Tell SW to download all audio + images in background
    sendToSW({
      type: 'CACHE_ALL_SONGS',
      songs: songs.map((s) => ({ audio_url: s.audio_url, image_url: s.image_url })),
    });

    // 3. Mark which songs are already cached (for UI indicators)
    if ('caches' in window) {
      caches.open('faarfannaa-audio').then(async (cache) => {
        const cached = new Set<string>();
        for (const song of songs) {
          if (await cache.match(song.audio_url)) cached.add(song.id);
        }
        setCachedSongIds(cached);
      });
    }
  }, [sendToSW]);

  // ── Background prefetch — load ALL songs once per session ────────────────
  // This is the key to "play any song offline":
  // On first load, fetch every song from the API and cache all audio files.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only run once per session — don't re-hammer the API on every page visit
    if (sessionStorage.getItem('songs_prefetched') === '1') return;

    const prefetch = async () => {
      try {
        const res  = await fetch('/api/songs');
        if (!res.ok) return;
        const data = await res.json();
        const songs: Song[] = data.songs || [];
        if (!songs.length) return;

        // Mark done before async cache work so a reload doesn't duplicate
        sessionStorage.setItem('songs_prefetched', '1');

        // Persist metadata + trigger audio caching
        cacheAllSongs(songs);
      } catch { /* offline at startup — IDB already has data from last session */ }
    };

    // Delay slightly so it doesn't compete with the initial page render
    const t = setTimeout(prefetch, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, isPlaying, currentTime, duration, volume,
      isOffline, cachedSongIds, offlineSongs, offlineArtists,
      playSong, pauseSong, resumeSong, nextSong, prevSong,
      seekTo, setVolume, addToQueue, clearQueue, downloadSong, cacheAllSongs,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}
