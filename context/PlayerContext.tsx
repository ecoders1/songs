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
  playSong: (song: Song, queue?: Song[]) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;
  downloadSong: (song: Song) => void;
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

  const playSong = useCallback((song: Song, newQueue: Song[] = []) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentSong(song);
    setQueue(newQueue.filter((s) => s.id !== song.id));
    audio.src = song.audio_url;
    audio.play().catch(() => {});
    setIsPlaying(true);

    // Cache for offline via SW
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_AUDIO', url: song.audio_url });
    }
  }, []);

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
      return rest;
    });
  }, []);

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

  // Download = cache to SW for offline playback only, NOT save to device storage
  const downloadSong = useCallback(async (song: Song) => {
    try {
      // Tell service worker to cache this audio for offline
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CACHE_AUDIO', url: song.audio_url });
      }
      // Also pre-cache via Cache API directly as fallback
      if ('caches' in window) {
        const cache = await caches.open('faarfannaa-audio-v1');
        const existing = await cache.match(song.audio_url);
        if (!existing) {
          const response = await fetch(song.audio_url);
          if (response.ok) await cache.put(song.audio_url, response);
        }
      }
    } catch {
      console.error('Cache failed');
    }
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, isPlaying, currentTime, duration, volume,
      playSong, pauseSong, resumeSong, nextSong, prevSong,
      seekTo, setVolume, addToQueue, clearQueue, downloadSong,
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
