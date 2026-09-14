'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage, type AppLanguage } from '@/context/LanguageContext';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { usePlayer } from '@/context/PlayerContext';
import Image from 'next/image';
import type { Song, Artist } from '@/lib/types';

const LANGUAGES: { key: AppLanguage; label: string; native: string; flag: string }[] = [
  { key: 'oromo',   label: 'Afaan Oromoo', native: 'Afaan Oromoo', flag: '🇪🇹' },
  { key: 'english', label: 'English',      native: 'English',      flag: '🌍' },
  { key: 'amharic', label: 'Amharic',      native: 'አማርኛ',         flag: '🇪🇹' },
  { key: 'sidama',  label: 'Sidama',       native: 'Sidaamu Afoo', flag: '🇪🇹' },
  { key: 'arabic',  label: 'Arabic',       native: 'العربية',      flag: '🌙' },
];

const THEMES: { key: Theme; label: string; icon: string; desc: string }[] = [
  { key: 'light',  label: 'Light',  icon: '☀️', desc: 'Clean white' },
  { key: 'dark',   label: 'Dark',   icon: '🌙', desc: 'Easy on eyes' },
  { key: 'system', label: 'System', icon: '⚙️', desc: 'Auto detect' },
];

const SOCIAL = [
  {
    label: 'Portfolio',
    sub: 'ermi-done.vercel.app',
    href: 'https://ermi-done.vercel.app',
    bg: '#1a1a2e',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
    ),
  },
  {
    label: 'Telegram',
    sub: '@milkibn',
    href: 'https://t.me/milkibn',
    bg: '#0088cc',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.697l-2.95-.924c-.64-.203-.654-.64.136-.948l11.526-4.445c.534-.194 1.001.13.37.868z"/>
      </svg>
    ),
  },
  {
    label: 'Telegram Channel',
    sub: '@aposotolicchurch',
    href: 'https://t.me/aposotolicchurch',
    bg: '#005fa3',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.697l-2.95-.924c-.64-.203-.654-.64.136-.948l11.526-4.445c.534-.194 1.001.13.37.868z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    sub: 'Oro Waliif',
    href: 'https://m.youtube.com/@oro_waliif',
    bg: '#FF0000',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    sub: 'Dhalootaa Waldaa Ergaamootaa',
    href: 'https://www.facebook.com/61579886334861',
    bg: '#1877F2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { cachedSongIds } = usePlayer();
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // ── Offline / download state ───────────────────────────────────────────────
  const [totalSongs,       setTotalSongs]       = useState(0);
  const [cachedCount,      setCachedCount]      = useState(0);
  const [isDownloading,    setIsDownloading]    = useState(false);
  const [downloadDone,     setDownloadDone]     = useState(false);
  const [storageUsed,      setStorageUsed]      = useState<string | null>(null);
  const [clearConfirm,     setClearConfirm]     = useState(false);
  const progressRef = useRef<{ done: number; total: number }>({ done: 0, total: 0 });

  // Load total song count + check storage
  useEffect(() => {
    // Get total songs from API (or cached count as fallback)
    fetch('/api/songs')
      .then(r => r.json())
      .then(({ songs }: { songs: Song[] }) => {
        if (songs?.length) setTotalSongs(songs.length);
      })
      .catch(() => {});

    // Storage estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage }) => {
        if (usage) {
          const mb = (usage / (1024 * 1024)).toFixed(1);
          setStorageUsed(`${mb} MB`);
        }
      });
    }
  }, []);

  // Sync cachedCount from context
  useEffect(() => {
    setCachedCount(cachedSongIds.size);
    if (cachedSongIds.size > 0 && cachedSongIds.size >= totalSongs && totalSongs > 0) {
      setDownloadDone(true);
    }
  }, [cachedSongIds, totalSongs]);

  // Listen for SW progress messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'CACHE_PROGRESS') {
        progressRef.current = { done: e.data.done, total: e.data.total };
        setCachedCount(e.data.done);
      }
      if (e.data?.type === 'CACHE_COMPLETE') {
        setIsDownloading(false);
        setDownloadDone(true);
        setCachedCount(e.data.total);
        setTotalSongs(e.data.total);
        // Refresh storage estimate
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          navigator.storage.estimate().then(({ usage }) => {
            if (usage) setStorageUsed(`${(usage / (1024 * 1024)).toFixed(1)} MB`);
          });
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadDone(false);
    try {
      const [songsRes, artistsRes] = await Promise.all([
        fetch('/api/songs'),
        fetch('/api/artists'),
      ]);
      const { songs }: { songs: Song[] }     = await songsRes.json();
      const { artists }: { artists: Artist[] } = artistsRes.ok ? await artistsRes.json() : { artists: [] };
      if (!songs?.length) { setIsDownloading(false); return; }
      setTotalSongs(songs.length);
      // Send to SW for gentle background caching with progress reporting
      const sw = navigator.serviceWorker.controller;
      if (sw) {
        sw.postMessage({
          type: 'CACHE_ALL_SONGS_GENTLE',
          songs: songs.map(s => ({ id: s.id, audio_url: s.audio_url })),
        });
      }
      // Also cache artist images immediately
      const imageUrls = [...new Set(
        [...songs.map(s => s.image_url), ...artists.map(a => a.image_url)].filter(Boolean) as string[]
      )];
      if (imageUrls.length && sw) sw.postMessage({ type: 'CACHE_IMAGES', urls: imageUrls });
    } catch {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  const handleClearCache = useCallback(async () => {
    if (!clearConfirm) { setClearConfirm(true); setTimeout(() => setClearConfirm(false), 4000); return; }
    setClearConfirm(false);
    try {
      await caches.delete('faarfannaa-audio');
      await caches.delete('faarfannaa-img');
      localStorage.removeItem('audio_cached_ever');
      localStorage.removeItem('songs_prefetched_at');
      setCachedCount(0);
      setDownloadDone(false);
      setStorageUsed(null);
    } catch { /* silent */ }
  }, [clearConfirm]);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setPwaInstallable(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') { setPwaInstallable(false); setDeferredPrompt(null); }
  };

  const currentLang = LANGUAGES.find(l => l.key === language)!;
  const isDark = resolvedTheme === 'dark';
  const progress = totalSongs > 0 ? Math.min((cachedCount / totalSongs) * 100, 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-5 pt-14 pb-8"
        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2744 60%, #0f3460 100%)' }}>
        {/* Decorative ring */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(212,175,55,0.12)' }} />
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(212,175,55,0.08)' }} />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(212,175,55,0.4)', boxShadow: '0 0 20px rgba(212,175,55,0.2)' }}>
            <Image src="/icons/icon-192.png" alt="Logo" width={56} height={56} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white leading-tight">Faarfannaa</h1>
            <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>Waldaa Ergaamootaa</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>v1.0.0 · Free · Offline</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* ── Install banner ─────────────────────────────────────────────── */}
        {pwaInstallable && (
          <button onClick={handleInstallPWA}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F0D060 100%)', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(26,26,46,0.15)' }}>
              <svg width="20" height="20" fill="#1a1a2e" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-sm" style={{ color: '#1a1a2e' }}>Install App</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(26,26,46,0.6)' }}>Add to home screen for offline use</p>
            </div>
            <svg width="16" height="16" fill="none" stroke="#1a1a2e" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* ── Offline & Storage ──────────────────────────────────────────── */}
        <Section label="Offline & Storage">
          {/* Status row */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {downloadDone ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#22C55E' }}>
                    <svg width="14" height="14" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Ready offline
                  </span>
                ) : isDownloading ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#D4AF37' }}>
                    <span style={{
                      width: 12, height: 12, borderRadius: '50%',
                      border: '2px solid rgba(212,175,55,0.3)',
                      borderTopColor: '#D4AF37',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Downloading…
                  </span>
                ) : (
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
                    📥 Not fully downloaded
                  </span>
                )}
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>
                {cachedCount}{totalSongs > 0 ? ` / ${totalSongs}` : ''} songs
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: downloadDone
                    ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                    : 'linear-gradient(90deg, #D4AF37, #F0D060)',
                }}
              />
            </div>

            {storageUsed && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
                Storage used: {storageUsed}
              </p>
            )}
          </div>

          {/* Download All button */}
          <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading || downloadDone}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: downloadDone
                  ? 'rgba(34,197,94,0.12)'
                  : isDownloading
                    ? 'rgba(212,175,55,0.15)'
                    : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 100%)',
                color: downloadDone ? '#22C55E' : isDownloading ? '#D4AF37' : '#1a1a2e',
                border: downloadDone ? '1px solid rgba(34,197,94,0.3)' : 'none',
                opacity: isDownloading ? 0.9 : 1,
                cursor: isDownloading || downloadDone ? 'default' : 'pointer',
              }}
            >
              {downloadDone ? (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  All Songs Downloaded
                </>
              ) : isDownloading ? (
                <>
                  <span style={{
                    width: 15, height: 15, borderRadius: '50%',
                    border: '2.5px solid rgba(212,175,55,0.3)',
                    borderTopColor: '#D4AF37',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  {cachedCount > 0 && totalSongs > 0
                    ? `${cachedCount} of ${totalSongs} downloaded…`
                    : 'Downloading…'}
                </>
              ) : (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download All for Offline
                </>
              )}
            </button>
          </div>

          {/* Clear cache */}
          <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleClearCache}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: clearConfirm ? 'rgba(239,68,68,0.1)' : 'var(--surface-2)',
                color: clearConfirm ? '#EF4444' : 'var(--text-3)',
                border: clearConfirm ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {clearConfirm ? 'Tap again to confirm clear' : 'Clear Offline Cache'}
            </button>
          </div>
        </Section>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <Section label="Appearance">
          <div className="p-4">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-3)' }}>Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((th) => {
                const active = theme === th.key;
                return (
                  <button key={th.key} onClick={() => setTheme(th.key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                    style={active
                      ? { background: '#D4AF37', boxShadow: '0 4px 12px rgba(212,175,55,0.4)' }
                      : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-xl leading-none">{th.icon}</span>
                    <span className="text-xs font-bold" style={{ color: active ? '#1a1a2e' : 'var(--text-1)' }}>{th.label}</span>
                    <span className="text-xs" style={{ color: active ? 'rgba(26,26,46,0.6)' : 'var(--text-3)' }}>{th.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Language ───────────────────────────────────────────────────── */}
        <Section label="Language">
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity">
            <span className="text-2xl leading-none">{currentLang.flag}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{currentLang.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{currentLang.native}</p>
            </div>
            <svg width="16" height="16" fill="none" stroke="var(--text-3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ transform: showLangPicker ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showLangPicker && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {LANGUAGES.map((lang, i) => (
                <button key={lang.key}
                  onClick={() => { setLanguage(lang.key); setShowLangPicker(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
                  style={{
                    borderBottom: i < LANGUAGES.length - 1 ? '1px solid var(--border)' : 'none',
                    background: language === lang.key ? (isDark ? 'rgba(212,175,55,0.1)' : '#FFFBEB') : 'transparent',
                  }}>
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{lang.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{lang.native}</p>
                  </div>
                  {language === lang.key && (
                    <svg width="16" height="16" fill="none" stroke="#D4AF37" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── Contact & Community ────────────────────────────────────────── */}
        <Section label="Contact & Community">
          {SOCIAL.map((s, i) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity"
              style={{ borderBottom: i < SOCIAL.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: s.bg }}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{s.label}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{s.sub}</p>
              </div>
              <svg width="14" height="14" fill="none" stroke="var(--text-3)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </Section>

        {/* ── About ──────────────────────────────────────────────────────── */}
        <Section label="About">
          {/* Scripture — Acts 2:38 */}
          <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#D4AF37' }}>
              Hojii Ergaamootaa 2:38
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
              "Phexrosis akkanaa jedhe: Deebiseetokkon tokkon keessan qalbii jijiraadha, dhifaama cubbuu keessanitiifis maqaa Yesus Kiristositti cuuphamaa kennaa hafuuraa Qulqulluus ni argattuu."
            </p>
          </div>

          {[
            { label: 'App',       value: 'Faarfannaa Waldaa Ergaamootaa' },
            { label: 'Version',   value: '1.0.0' },
            { label: 'Platform',  value: 'PWA · Works Offline' },
            { label: 'Developer', value: 'Apostolic Church' },
          ].map((item, i, arr) => (
            <div key={item.label}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>{item.label}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.value}</span>
            </div>
          ))}
        </Section>

        {/* Footer */}
        <div className="pb-10 text-center space-y-1.5">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Faarfannaa Waldaa Ergaamootaa</p>
          <p className="text-xs" style={{ color: 'var(--text-3)', opacity: 0.6 }}>Made with ❤️ for the Church</p>
        </div>

      </div>
    </div>
  );
}

/* ── Reusable section wrapper ─────────────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}>
        {children}
      </div>
    </div>
  );
}
