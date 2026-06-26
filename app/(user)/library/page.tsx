'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSongCache, setSongCache } from '@/lib/dataCache';
import type { Song } from '@/lib/types';

export default function LibraryPage() {
  const router = useRouter();
  const { playSong, currentSong, isPlaying, isOffline, cachedSongIds, cacheAllSongs, downloadSong, offlineSongs } = usePlayer();
  const { t } = useLanguage();
  const [activeLanguage, setActiveLanguage] = useState('all');
  const [songs, setSongs] = useState<Song[]>(() => getSongCache('all') || []);
  const [loading, setLoading] = useState(() => !getSongCache('all'));
  const [caching, setCaching] = useState(false);
  const [cacheMsg, setCacheMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const languages = ['all', 'oromo', 'english', 'amharic', 'sidama', 'arabic'];

  useEffect(() => {
    const lang = activeLanguage;

    // Serve from cache instantly
    const cached = getSongCache(lang);
    if (cached) {
      setSongs(cached);
      setLoading(false);
      // Background refresh
      const url = lang === 'all' ? '/api/songs' : `/api/songs?language=${lang}`;
      fetch(url)
        .then((r) => r.json())
        .then(({ songs: fresh }) => {
          if (fresh?.length) {
            setSongCache(lang, fresh);
            setSongs(fresh);
            cacheAllSongs(fresh);
          }
        })
        .catch(() => {});
      return;
    }

    // No cache — fetch with shimmer
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const url = lang === 'all' ? '/api/songs' : `/api/songs?language=${lang}`;
    fetch(url, { signal: abortRef.current.signal })
      .then((r) => r.json())
      .then(({ songs: list }) => {
        const data: Song[] = list || [];
        const finalList = data.length > 0 ? data
          : (isOffline ? offlineSongs.filter(
              (s) => lang === 'all' || s.language === lang
            ) : []);
        if (data.length > 0) {
          setSongCache(lang, finalList);
          cacheAllSongs(finalList);
        }
        setSongs(finalList);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        const fallback = isOffline
          ? offlineSongs.filter((s) => lang === 'all' || s.language === lang)
          : [];
        setSongs(fallback);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [activeLanguage, cacheAllSongs, isOffline, offlineSongs]);

  const fmt = (sec: number | null) => {
    if (!sec) return '';
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  };

  const handleCacheAll = async () => {
    if (caching || isOffline) return;
    setCaching(true);
    let count = 0;
    for (const song of songs) {
      await downloadSong(song);
      count++;
    }
    setCaching(false);
    setCacheMsg(`✓ ${count} songs saved for offline`);
    setTimeout(() => setCacheMsg(''), 4000);
  };

  return (
    <div className="min-h-screen bg-white">
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium"
          style={{ background: '#FFF3CD', color: '#856404' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" strokeLinecap="round" />
          </svg>
          Offline — showing cached songs
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">{t.library}</h1>
          {!isOffline && songs.length > 0 && (
            <button onClick={handleCacheAll} disabled={caching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ background: caching ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
              {caching ? (
                <><svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/></svg>Saving...</>
              ) : (
                <><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/></svg>Save Offline</>
              )}
            </button>
          )}
        </div>

        {cacheMsg && <p className="text-xs mb-2" style={{ color: '#D4AF37' }}>{cacheMsg}</p>}

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {languages.map((lang) => (
            <button key={lang} onClick={() => setActiveLanguage(lang)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
              style={activeLanguage === lang
                ? { background: '#D4AF37', color: '#1a1a2e' }
                : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              {lang === 'all' ? 'All Songs' : lang}
            </button>
          ))}
        </div>
      </div>

      {/* Song list */}
      <div className="px-4 pt-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded shimmer w-3/4" />
                  <div className="h-3 rounded shimmer w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto mb-3" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <p>{isOffline ? 'No cached songs. Connect to internet first.' : 'No songs found'}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {songs.length} songs
              {cachedSongIds.size > 0 && (
                <span className="ml-2" style={{ color: '#D4AF37' }}>· {cachedSongIds.size} saved offline</span>
              )}
            </p>
            <div className="space-y-1 fade-in">
              {songs.map((song) => {
                const isActive = currentSong?.id === song.id;
                const isCached = cachedSongIds.has(song.id);
                return (
                  <button key={song.id}
                    onClick={() => { playSong(song, songs); router.push('/player'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-100"
                    style={{ background: isActive ? '#FFF8E7' : 'transparent' }}>
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden relative"
                      style={{ background: isActive ? '#D4AF37' : '#f0f0f8' }}>
                      {song.image_url ? (
                        <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <svg width="20" height="20" fill="none" stroke={isActive ? '#1a1a2e' : '#D4AF37'} strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M9 18V5l12-2v13" strokeLinecap="round" />
                          <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                      )}
                      {isCached && (
                        <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white"
                          style={{ background: '#22c55e' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${isActive ? 'text-yellow-600' : 'text-gray-800'}`}>
                        {song.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {song.artist?.name} · Track {song.track_number}
                      </p>
                    </div>
                    {isActive && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-1 rounded-full"
                            style={{ height: `${(i + 1) * 4}px`, background: '#D4AF37',
                              animation: `pulse 0.8s ease-in-out ${i * 0.2}s infinite alternate` }} />
                        ))}
                      </div>
                    ) : (
                      song.duration && (
                        <span className="text-xs text-gray-400">{fmt(song.duration)}</span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
