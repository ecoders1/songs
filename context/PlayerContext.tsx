'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { Song } from '@/lib/types';

interface PlayerContextType {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isOffline: boolean;
  cachedSongIds: Set<string>;
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
  cacheAllSongs: (songs: Song[]) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedSongIds, setCachedSongIds] = useState<Set<string>>(new Set());

  // Track online/offline status
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
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

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Tell SW to cache a single audio URL
  const cacheSongInSW = useCallback((url: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_AUDIO', url });
    }
  }, []);

  const playSong = useCallback((song: Song, newQueue: Song[] = []) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentSong(song);
    setQueue(newQueue.filter((s) => s.id !== song.id));
    audio.src = song.audio_url;
    audio.play().catch(() => {});
    setIsPlaying(true);
    cacheSongInSW(song.audio_url);
  }, [cacheSongInSW]);

  const pauseSong = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resumeSong = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const nextSong = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setCurrentSong(next);
      const audio = audioRef.current;
      if (audio) { audio.src = next.audio_url; audio.play().catch(() => {}); }
      setIsPlaying(true);
      cacheSongInSW(next.audio_url);
      return rest;
    });
  }, [cacheSongInSW]);

  const prevSong = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    setVolumeState(vol);
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((prev) => [...prev, song]);
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  // Download = cache audio to SW for offline use (no device storage)
  const downloadSong = useCallback(async (song: Song) => {
    try {
      cacheSongInSW(song.audio_url);
      if ('caches' in window) {
        const cache = await caches.open('faarfannaa-audio-v1');
        const existing = await cache.match(song.audio_url);
        if (!existing) {
          const response = await fetch(song.audio_url);
          if (response.ok) {
            await cache.put(song.audio_url, response);
            // Mark as cached
            setCachedSongIds((prev) => new Set([...prev, song.id]));
          }
        } else {
          setCachedSongIds((prev) => new Set([...prev, song.id]));
        }
      }
    } catch {
      // fail silently
    }
  }, [cacheSongInSW]);

  // Pre-cache ALL songs for full offline use
  const cacheAllSongs = useCallback((songs: Song[]) => {
    if (!songs.length) return;

    // Tell SW to cache all audio + images in background
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_ALL_SONGS',
        songs: songs.map((s) => ({ audio_url: s.audio_url, image_url: s.image_url })),
      });
    }

    // Also check which are already cached and update state
    if ('caches' in window) {
      caches.open('faarfannaa-audio-v1').then(async (cache) => {
        const cached = new Set<string>();
        for (const song of songs) {
          const match = await cache.match(song.audio_url);
          if (match) cached.add(song.id);
        }
        setCachedSongIds(cached);
      });
    }
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, isPlaying, currentTime, duration, volume,
      isOffline, cachedSongIds,
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
