'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { usePlayer } from '@/context/PlayerContext';
import type { Artist, Category } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isOffline } = usePlayer();
  const [selectedCategory, setSelectedCategory] = useState<Category>('new');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
    { key: 'new',    label: t.newSongs,    emoji: '🎵' },
    { key: 'group',  label: t.groupSongs,  emoji: '👥' },
    { key: 'single', label: t.singleSongs, emoji: '🎤' },
    { key: 'old',    label: t.oldSongs,    emoji: '📀' },
  ];

  const fetchArtists = useCallback(async (cat: Category) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artists?category=${cat}`);
      const data = await res.json();
      setArtists(data.artists || []);
    } catch {
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtists(selectedCategory);
  }, [selectedCategory, fetchArtists]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.artists || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayList = searchQuery.trim() ? searchResults : artists;

  return (
    <div className="min-h-screen bg-white">
      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
          style={{ background: '#FFF3CD', color: '#856404' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" strokeLinecap="round" />
          </svg>
          Offline — showing cached content
        </div>
      )}
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-12 pb-4"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(212,175,55,0.6)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <Image src="/icons/icon.svg" alt="Logo" width={44} height={44} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Apostolic Songs</h1>
            <p className="text-xs font-medium" style={{ color: '#D4AF37' }}>Afaan Oromo</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="16" height="16" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-white text-gray-800 outline-none"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category buttons */}
      {!searchQuery && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
              style={
                selectedCategory === cat.key
                  ? { background: '#D4AF37', color: '#1a1a2e' }
                  : { background: '#f0f0f8', color: '#5a5a7a' }
              }
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Section title */}
      <div className="px-4 py-2">
        <h2 className="font-semibold text-gray-800">
          {searchQuery
            ? `Results for "${searchQuery}"`
            : CATEGORIES.find((c) => c.key === selectedCategory)?.label}
        </h2>
      </div>

      {/* Artist list */}
      <div className="px-4 pb-4">
        {loading || isSearching ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8f8fc' }}>
                <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded shimmer w-2/3" />
                  <div className="h-3 rounded shimmer w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto mb-3" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <p>{t.noArtistsFound}</p>
          </div>
        ) : (
          <div className="space-y-2 fade-in">
            {displayList.map((artist) => (
              <button
                key={artist.id}
                onClick={() => router.push(`/artist/${artist.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 active:scale-98"
                style={{ background: '#f8f8fc' }}
              >
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: '#e8e8f8' }}
                >
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg width="24" height="24" fill="none" stroke="#D4AF37" strokeWidth="1.8" viewBox="0 0 24 24">
                      {artist.is_group ? (
                        <>
                          <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87" strokeLinecap="round" />
                          <circle cx="9" cy="8" r="4" />
                          <circle cx="17" cy="8" r="4" />
                        </>
                      ) : (
                        <>
                          <circle cx="12" cy="8" r="4" />
                          <path d="M20 20c0-4.4-3.6-8-8-8s-8 3.6-8 8" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{artist.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {artist.is_group ? t.group : t.artist} · {artist.category}
                  </p>
                </div>

                {/* Arrow */}
                <svg width="16" height="16" fill="none" stroke="#ccc" strokeWidth="2" viewBox="0 0 24 24">
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
