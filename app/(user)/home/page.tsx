'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { usePlayer } from '@/context/PlayerContext';
import { getArtistCache, setArtistCache } from '@/lib/dataCache';
import type { Artist, Category } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isOffline, offlineArtists, cacheAllSongs } = usePlayer();
  const [selectedCategory, setSelectedCategory] = useState<Category>('new');
  const [artists, setArtists] = useState<Artist[]>(() => getArtistCache('new') || []);
  const [loading, setLoading] = useState(() => !getArtistCache('new'));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
    { key: 'new',    label: t.newSongs,    emoji: '🎵' },
    { key: 'group',  label: t.groupSongs,  emoji: '👥' },
    { key: 'single', label: t.singleSongs, emoji: '🎤' },
    { key: 'old',    label: t.oldSongs,    emoji: '📀' },
  ];

  const fetchArtists = useCallback(async (cat: Category) => {
    const cached = getArtistCache(cat);
    if (cached) {
      setArtists(cached);
      setLoading(false);
      fetch(`/api/artists?category=${cat}`)
        .then((r) => r.json())
        .then(({ artists: fresh }) => {
          if (fresh?.length) { setArtistCache(cat, fresh); setArtists(fresh); cacheAllSongs([], fresh); }
        }).catch(() => {});
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`/api/artists?category=${cat}`, { signal: abortRef.current.signal });
      const data = await res.json();
      const list: Artist[] = data.artists || [];
      const finalList = list.length > 0 ? list : (isOffline ? offlineArtists.filter((a) => a.category === cat) : []);
      if (list.length > 0) { setArtistCache(cat, finalList); cacheAllSongs([], finalList); }
      setArtists(finalList);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setArtists(isOffline ? offlineArtists.filter((a) => a.category === cat) : []);
    } finally { setLoading(false); }
  }, [isOffline, offlineArtists, cacheAllSongs]);

  useEffect(() => {
    fetchArtists(selectedCategory);
    return () => abortRef.current?.abort();
  }, [selectedCategory, fetchArtists]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        const list = data.artists || [];
        setSearchResults(list.length > 0 ? list : offlineArtists.filter((a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase())));
      } catch {
        setSearchResults(offlineArtists.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase())));
      } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, offlineArtists]);

  const displayList = searchQuery.trim() ? searchResults : artists;

  return (
    <div className="min-h-screen" style={{ background: '#f4f4f8' }}>
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 px-4 pt-12 pb-3"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>

        {/* Logo + offline pill */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(212,175,55,0.5)' }}>
              <Image src="/icons/icon.svg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Apostolic Songs</h1>
              <p className="text-xs" style={{ color: '#D4AF37' }}>Afaan Oromo</p>
            </div>
          </div>

          {/* Offline / Online indicator pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: isOffline ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
              border: `1px solid ${isOffline ? 'rgba(234,179,8,0.4)' : 'rgba(34,197,94,0.4)'}`,
            }}>
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: isOffline ? '#EAB308' : '#22C55E',
                boxShadow: isOffline ? 'none' : '0 0 4px #22C55E' }} />
            <span className="text-xs font-medium"
              style={{ color: isOffline ? '#EAB308' : '#22C55E' }}>
              {isOffline ? 'Offline' : 'Online'}
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2"
            width="15" height="15" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input type="text" placeholder={t.searchPlaceholder} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none"
              onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* ── Category pills ── */}
      {!searchQuery && (
        <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
              style={selectedCategory === cat.key
                ? { background: '#D4AF37', color: '#1a1a2e', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }
                : { background: 'white', color: '#5a5a7a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Section title ── */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {searchQuery ? `Results for "${searchQuery}"` : CATEGORIES.find((c) => c.key === selectedCategory)?.label}
        </p>
      </div>

      {/* ── Artist list ── */}
      <div className="px-4 pb-6">
        {loading || isSearching ? (
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white">
                <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded-lg shimmer w-2/3" />
                  <div className="h-3 rounded-lg shimmer w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto mb-3" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <p className="text-sm">{t.noArtistsFound}</p>
            {isOffline && <p className="text-xs mt-1">Connect to internet to load artists</p>}
          </div>
        ) : (
          <div className="space-y-2 fade-in">
            {displayList.map((artist) => (
              <button key={artist.id}
                onClick={() => router.push(`/artist/${artist.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-98 transition-transform duration-100"
                style={{ background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: '#eeeef8' }}>
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg width="26" height="26" fill="none" stroke="#D4AF37" strokeWidth="1.6" viewBox="0 0 24 24">
                      {artist.is_group ? (
                        <><path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87" strokeLinecap="round" />
                          <circle cx="9" cy="8" r="4" /><circle cx="17" cy="8" r="4" /></>
                      ) : (
                        <><circle cx="12" cy="8" r="4" />
                          <path d="M20 20c0-4.4-3.6-8-8-8s-8 3.6-8 8" strokeLinecap="round" /></>
                      )}
                    </svg>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{artist.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {artist.is_group ? t.group : t.artist}
                    <span className="mx-1">·</span>
                    <span className="capitalize">{artist.category}</span>
                  </p>
                </div>
                <svg width="16" height="16" fill="none" stroke="#d0d0d8" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
