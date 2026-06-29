'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { usePlayer } from '@/context/PlayerContext';
import { useUser } from '@/context/UserContext';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { getArtistCache, setArtistCache } from '@/lib/dataCache';
import InstallPrompt from '@/components/InstallPrompt';
import type { Artist, Category } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isOffline, offlineArtists, cacheAllSongs } = usePlayer();
  const { user } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('new');
  const [artists, setArtists] = useState<Artist[]>(() => getArtistCache('new') || []);
  const [loading, setLoading] = useState(() => !getArtistCache('new'));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLockedMsg, setShowLockedMsg] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  void user; // used for auth guard in layout

  // Close theme menu on outside click
  useEffect(() => {
    if (!showThemeMenu) return;
    const handler = () => setShowThemeMenu(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showThemeMenu]);

  const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
    { key: 'new',    label: t.newSongs,    emoji: '🎵' },
    { key: 'group',  label: t.groupSongs,  emoji: '👥' },
    { key: 'single', label: t.singleSongs, emoji: '🎤' },
    { key: 'old',    label: t.oldSongs,    emoji: '📀' },
  ];

  const handleLockedClick = () => {
    setShowLockedMsg(true);
    setTimeout(() => setShowLockedMsg(false), 3000);
  };

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
        setSearchResults(offlineArtists.filter((a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase())));
      } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, offlineArtists]);

  const displayList = searchQuery.trim() ? searchResults : artists;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <InstallPrompt />

      {/* ── Sticky frosted-glass header ────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-4 pt-11 pb-3"
        style={{
          background: 'linear-gradient(175deg, #1a1a2e 0%, #16213e 100%)',
          /* subtle bottom fade so content slides under cleanly */
          WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
        }}
      >
        {/* Row 1 — Logo · lock · status pill */}
        <div className="flex items-center justify-between mb-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: '1.5px solid rgba(212,175,55,0.45)', boxShadow: '0 0 12px rgba(212,175,55,0.15)' }}
            >
              <Image src="/icons/icon.png" alt="Logo" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight tracking-tight">Apostolic Songs</p>
              <p className="text-xs leading-tight" style={{ color: '#D4AF37' }}>Afaan Oromo</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">

            {/* 🎨 Theme toggle */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all active:opacity-60"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                aria-label="Change theme"
              >
                {resolvedTheme === 'dark' ? (
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
                  </svg>
                )}
              </button>

              {/* Theme dropdown */}
              {showThemeMenu && (
                <div
                  className="absolute right-0 top-10 z-50 rounded-2xl overflow-hidden shadow-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', minWidth: 140 }}
                >
                  {([
                    { key: 'light',  label: 'Light',  icon: '☀️' },
                    { key: 'dark',   label: 'Dark',   icon: '🌙' },
                    { key: 'system', label: 'System', icon: '⚙️' },
                  ] as { key: Theme; label: string; icon: string }[]).map((opt, i, arr) => (
                    <button
                      key={opt.key}
                      onClick={() => { setTheme(opt.key); setShowThemeMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all active:opacity-60"
                      style={{
                        color: theme === opt.key ? 'var(--gold)' : 'var(--text-1)',
                        background: theme === opt.key ? 'rgba(212,175,55,0.08)' : 'transparent',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {theme === opt.key && (
                        <svg className="ml-auto" width="14" height="14" fill="none" stroke="#D4AF37" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 🔒 Locked upload — frosted pill */}
            <button
              onClick={handleLockedClick}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity active:opacity-60"
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.45)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}
              aria-label="Upload locked — admin only"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
              </svg>
              Upload
            </button>

            {/* Online / Offline pill — polished */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-500"
              style={{
                background: isOffline ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)',
                border: `1px solid ${isOffline ? 'rgba(234,179,8,0.35)' : 'rgba(34,197,94,0.35)'}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: isOffline ? '#EAB308' : '#22C55E',
                  ...(isOffline ? {} : { animation: 'breathe 2.2s ease-in-out infinite' }),
                }}
              />
              <span
                className="text-xs font-semibold leading-none"
                style={{ color: isOffline ? '#EAB308' : '#22C55E' }}
              >
                {isOffline ? 'Offline' : 'Online'}
              </span>
            </div>
          </div>
        </div>

        {/* Locked-upload toast */}
        {showLockedMsg && (
          <div
            className="mb-2 px-3 py-2 rounded-xl text-xs font-medium text-center fade-in"
            style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}
          >
            🔒 Only admins can upload songs and artists
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-gray-800 outline-none"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--input-text)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-gray-400"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Category pills ──────────────────────────────────────────────────── */}
      {!searchQuery && (
        <div className="px-4 pt-3 pb-0.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                style={active
                  ? { background: '#D4AF37', color: '#1a1a2e', boxShadow: '0 2px 10px rgba(212,175,55,0.45)' }
                  : { background: 'var(--pill-inactive-bg)', color: 'var(--pill-inactive-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid var(--pill-inactive-border)' }}
              >
                <span className="text-sm leading-none">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Section label ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
          {searchQuery
            ? `Results · "${searchQuery}"`
            : CATEGORIES.find((c) => c.key === selectedCategory)?.label}
        </p>
      </div>

      {/* ── Artist list ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-8">
        {loading || isSearching ? (
          /* Skeleton cards */
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}>
                <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-lg shimmer w-2/3" />
                  <div className="h-3 rounded-lg shimmer w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
            <svg className="mx-auto mb-3" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.4" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <p className="text-sm">{t.noArtistsFound}</p>
            {isOffline && <p className="text-xs mt-1 opacity-60">Connect to internet to load artists</p>}
          </div>
        ) : (
          <div className="space-y-2 fade-in">
            {displayList.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} t={t} onPress={() => router.push(`/artist/${artist.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Artist card ─────────────────────────────────────────────────────────────── */
function ArtistCard({
  artist, t, onPress,
}: {
  artist: Artist;
  t: { group: string; artist: string };
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-100 active:scale-98"
      style={{
        background: 'var(--card-bg)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-13 h-13 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ width: 52, height: 52, background: 'linear-gradient(135deg, var(--surface-2), var(--border))' }}
      >
        {artist.image_url ? (
          <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
        ) : (
          <svg width="24" height="24" fill="none" stroke="#D4AF37" strokeWidth="1.6" viewBox="0 0 24 24">
            {artist.is_group ? (
              <>
                <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87" strokeLinecap="round"/>
                <circle cx="9" cy="8" r="4"/><circle cx="17" cy="8" r="4"/>
              </>
            ) : (
              <>
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 20c0-4.4-3.6-8-8-8s-8 3.6-8 8" strokeLinecap="round"/>
              </>
            )}
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--text-1)' }}>
          {artist.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          {artist.is_group ? t.group : t.artist}
          <span className="mx-1 opacity-40">·</span>
          <span className="capitalize">{artist.category}</span>
        </p>
      </div>

      {/* Chevron */}
      <svg width="15" height="15" fill="none" stroke="#d1d5db" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
