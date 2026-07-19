'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { getAllArtistsCache, setAllArtistsCache } from '@/lib/dataCache';
import type { Artist } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  new:    '🎵 New Songs',
  old:    '📀 Old Songs',
  single: '🎤 Single Artists',
  group:  '👥 Groups & Choirs',
};

const CATEGORY_ORDER = ['new', 'group', 'single', 'old'];

export default function LibraryPage() {
  const router = useRouter();
  const { isOffline, offlineArtists, cacheAllSongs } = usePlayer();
  const { t } = useLanguage();

  const [artists, setArtists] = useState<Artist[]>(() => getAllArtistsCache() || []);
  const [loading, setLoading] = useState(() => !getAllArtistsCache());
  const [searchQuery, setSearchQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cached = getAllArtistsCache();
    if (cached) {
      setArtists(cached);
      setLoading(false);
      // Background refresh
      fetch('/api/artists')
        .then((r) => r.json())
        .then(({ artists: fresh }) => {
          if (fresh?.length) {
            setAllArtistsCache(fresh);
            setArtists(fresh);
            cacheAllSongs([], fresh);
          }
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    fetch('/api/artists', { signal: abortRef.current.signal })
      .then((r) => r.json())
      .then(({ artists: list }) => {
        const data: Artist[] = list || [];
        const finalList = data.length > 0 ? data : (isOffline ? offlineArtists : []);
        if (data.length > 0) {
          setAllArtistsCache(finalList);
          cacheAllSongs([], finalList);
        }
        setArtists(finalList);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setArtists(isOffline ? offlineArtists : []);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [isOffline, offlineArtists, cacheAllSongs]);

  // Filter by search
  const filtered = searchQuery.trim()
    ? artists.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : artists;

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, Artist[]>>((acc, cat) => {
    const list = filtered.filter((a) => a.category === cat);
    if (list.length > 0) acc[cat] = list;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white">
      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
          style={{ background: '#FFF3CD', color: '#856404' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" strokeLinecap="round" />
          </svg>
          Offline — showing cached artists
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-12 pb-4"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
        <h1 className="text-xl font-bold text-white mb-4">{t.library}</h1>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2"
            width="16" height="16" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white text-gray-800 outline-none"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-6">
        {loading ? (
          <div className="px-4 pt-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8f8fc' }}>
                <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded shimmer w-2/3" />
                  <div className="h-3 rounded shimmer w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto mb-3" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <p>{isOffline ? 'No cached artists.' : t.noArtistsFound}</p>
          </div>
        ) : searchQuery.trim() ? (
          /* Flat list for search results */
          <div className="px-4 pt-4 space-y-2 fade-in">
            {filtered.map((artist) => (
              <ArtistRow key={artist.id} artist={artist} t={t} router={router} />
            ))}
          </div>
        ) : (
          /* Grouped by category */
          <div className="fade-in">
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat}>
                {/* Category header */}
                <div className="px-4 pt-5 pb-2">
                  <h2 className="font-bold text-gray-800 text-base">
                    {CATEGORY_LABELS[cat] || cat}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {list.length} {list.length === 1 ? (list[0].is_group ? t.group : t.artist) : (cat === 'group' ? 'groups' : 'artists')}
                  </p>
                </div>

                {/* Artist cards */}
                <div className="px-4 space-y-2">
                  {list.map((artist) => (
                    <ArtistRow key={artist.id} artist={artist} t={t} router={router} />
                  ))}
                </div>
              </div>
            ))}

            {/* Footer count */}
            <p className="text-center text-xs text-gray-300 mt-6 pb-2">
              {artists.length} artists total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtistRow({ artist, t, router }: {
  artist: Artist;
  t: { group: string; artist: string };
  router: ReturnType<typeof import('next/navigation').useRouter>;
}) {
  return (
    <button
      onClick={() => router.push(`/artist/${artist.id}`)}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-100 active:scale-98"
      style={{ background: '#f8f8fc' }}
    >
      {/* Avatar */}
      <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: '#e8e8f8' }}>
        {artist.image_url ? (
          <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <svg width="24" height="24" fill="none" stroke="#D4AF37" strokeWidth="1.8" viewBox="0 0 24 24">
            {artist.is_group ? (
              <>
                <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87" strokeLinecap="round" />
                <circle cx="9" cy="8" r="4" /><circle cx="17" cy="8" r="4" />
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
          {artist.is_group ? t.group : t.artist}
          {artist.bio && <span className="text-gray-400"> · {artist.bio.slice(0, 30)}{artist.bio.length > 30 ? '…' : ''}</span>}
        </p>
      </div>

      {/* Arrow */}
      <svg width="16" height="16" fill="none" stroke="#ccc" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
