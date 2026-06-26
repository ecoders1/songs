// Module-level in-memory cache — persists across tab switches within the same session.
// Data is never refetched unless stale (5 min TTL) or explicitly invalidated.

import type { Artist, Song } from '@/lib/types';

const TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const store: Record<string, CacheEntry<unknown>> = {};

function isStale(key: string): boolean {
  const entry = store[key];
  if (!entry) return true;
  return Date.now() - entry.fetchedAt > TTL;
}

export function getCached<T>(key: string): T | null {
  if (isStale(key)) return null;
  return (store[key]?.data as T) ?? null;
}

export function setCached<T>(key: string, data: T): void {
  store[key] = { data, fetchedAt: Date.now() };
}

export function invalidate(key: string): void {
  delete store[key];
}

export function invalidateAll(): void {
  Object.keys(store).forEach((k) => delete store[k]);
}

// Typed helpers
export function getArtistCache(category: string): Artist[] | null {
  return getCached<Artist[]>(`artists:${category}`);
}
export function setArtistCache(category: string, data: Artist[]): void {
  setCached(`artists:${category}`, data);
}

export function getAllArtistsCache(): Artist[] | null {
  return getCached<Artist[]>('artists:all');
}
export function setAllArtistsCache(data: Artist[]): void {
  setCached('artists:all', data);
}

export function getSongCache(language: string): Song[] | null {
  return getCached<Song[]>(`songs:${language}`);
}
export function setSongCache(language: string, data: Song[]): void {
  setCached(`songs:${language}`, data);
}
