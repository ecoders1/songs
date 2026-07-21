'use client';

import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export default function PlayerPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    currentSong, isPlaying, currentTime, duration, volume, queue,
    pauseSong, resumeSong, nextSong, prevSong, seekTo, setVolume, downloadSong, isOffline,
  } = usePlayer();

  const [showLyrics, setShowLyrics] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [playError, setPlayError] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Clear play error when song actually starts
  useEffect(() => {
    if (isPlaying) setPlayError(false);
  }, [isPlaying]);

  // Detect when audio fails to load (e.g. not cached offline)
  useEffect(() => {
    if (!isPlaying && isOffline && currentSong && duration === 0) {
      setPlayError(true);
    } else {
      setPlayError(false);
    }
  }, [isPlaying, isOffline, currentSong, duration]);

  const displayTime     = seeking ? seekValue : currentTime;
  const displayProgress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Protect lyrics: block all copy/cut/context-menu/screenshot attempts
  useEffect(() => {
    const el = lyricsRef.current;
    if (!el) return;
    const block = (e: Event) => e.preventDefault();
    el.addEventListener('copy', block);
    el.addEventListener('cut', block);
    el.addEventListener('contextmenu', block);
    el.addEventListener('selectstart', block);
    return () => {
      el.removeEventListener('copy', block);
      el.removeEventListener('cut', block);
      el.removeEventListener('contextmenu', block);
      el.removeEventListener('selectstart', block);
    };
  }, [showLyrics]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  };

  if (!currentSong) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0d1b2a, #0f3460)' }}>
        <div className="w-20 h-20 rounded-full overflow-hidden mb-6 opacity-50">
          <Image src="/icons/icon-192.png" alt="logo" width={80} height={80} className="w-full h-full" />
        </div>
        <p className="text-white/50 text-sm mb-2">{t.noSongPlaying}</p>
        <button onClick={() => router.push('/home')}
          className="mt-3 px-6 py-2.5 rounded-full text-sm font-bold"
          style={{ background: '#D4AF37', color: '#1a1a2e' }}>
          {t.browseSongs}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0d1b2a 0%, #16213e 40%, #1a2744 100%)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2">
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)' }} aria-label="Back">
          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t.nowPlaying}
          </p>
          <p className="text-sm font-bold text-white mt-0.5 truncate max-w-44">
            {currentSong.artist?.name || 'Apostolic Songs'}
          </p>
        </div>

        {/* Download button — saves to app cache only (offline use), not to device storage */}
        <button onClick={() => downloadSong(currentSong)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)' }} aria-label={t.download}>
          <svg width="17" height="17" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Album art */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        <div className="relative mb-6">
          <div
            className="w-64 h-64 rounded-3xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1a2744, #0f3460)',
              boxShadow: isPlaying
                ? '0 0 0 4px rgba(212,175,55,0.15), 0 24px 60px rgba(0,0,0,0.6)'
                : '0 16px 50px rgba(0,0,0,0.5)',
              transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
              transition: 'transform 0.4s ease, box-shadow 0.4s ease',
            }}
          >
            {currentSong.image_url ? (
              <img src={currentSong.image_url} alt={currentSong.title}
                className="w-full h-full object-cover" />
            ) : currentSong.artist?.image_url ? (
              <img src={currentSong.artist.image_url} alt={currentSong.artist.name}
                className="w-full h-full object-cover" />
            ) : (
              <Image src="/icons/icon-192.png" alt="Faarfannaa Afaan Oromo"
                width={140} height={140} className="w-36 h-36 opacity-80" />
            )}
          </div>

          {isPlaying && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ border: '2px solid rgba(212,175,55,0.3)',
                animation: 'spin 8s linear infinite' }} />
          )}
        </div>

        {/* Song title & artist */}
        <div className="text-center w-full max-w-xs mb-6">
          <h2 className="text-xl font-extrabold text-white truncate px-2">{currentSong.title}</h2>
          <p className="text-sm mt-1 font-medium" style={{ color: '#D4AF37' }}>
            {currentSong.artist?.name || 'Unknown Artist'}
          </p>
          {currentSong.language && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs capitalize"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
              {currentSong.language}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-1">
          <div
            ref={progressRef}
            className="relative h-1.5 rounded-full cursor-pointer group"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            onClick={handleProgressClick}
          >
            <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
              style={{ width: `${displayProgress}%`, background: 'linear-gradient(90deg, #D4AF37, #F0D060)' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-lg transition-all"
              style={{
                left: `calc(${displayProgress}% - 7px)`,
                background: '#F0D060',
                boxShadow: '0 0 6px rgba(212,175,55,0.8)',
              }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmt(displayTime)}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Hidden seek slider */}
        <div className="w-full max-w-xs -mt-6 opacity-0">
          <input type="range" min={0} max={duration || 100} value={currentTime}
            onChange={(e) => { setSeeking(true); setSeekValue(Number(e.target.value)); }}
            onMouseUp={(e) => { seekTo(Number((e.target as HTMLInputElement).value)); setSeeking(false); }}
            onTouchEnd={(e) => { seekTo(Number((e.target as HTMLInputElement).value)); setSeeking(false); }}
            className="w-full h-8 cursor-pointer" style={{ accentColor: '#D4AF37' }} />
        </div>

        {/* Offline / not-cached warning */}
        {playError && (
          <div className="w-full max-w-xs mb-3 px-4 py-2.5 rounded-2xl flex items-center gap-2 fade-in"
            style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)' }}>
            <svg width="14" height="14" fill="none" stroke="#EAB308" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
            </svg>
            <p className="text-xs font-medium flex-1" style={{ color: '#EAB308' }}>
              {isOffline ? 'Not cached — go online to play' : 'Tap play to retry'}
            </p>
            {!isOffline && (
              <button onClick={() => { setPlayError(false); resumeSong(); }}
                className="text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(234,179,8,0.2)', color: '#EAB308' }}>
                Retry
              </button>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-5 mt-2">
          <button onClick={prevSong}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.08)' }} aria-label="Previous">
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={isPlaying ? pauseSong : resumeSong}
            className="rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              width: 68, height: 68,
              background: 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #B8960C 100%)',
              boxShadow: '0 6px 24px rgba(212,175,55,0.5)',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="26" height="26" fill="#1a1a2e" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg width="28" height="28" fill="#1a1a2e" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button onClick={nextSong}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.08)' }} aria-label="Next">
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full max-w-xs mt-5">
          <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          </svg>
          <input type="range" min={0} max={1} step={0.02} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-1" style={{ accentColor: '#D4AF37' }} />
          <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Lyrics */}
      {currentSong.lyrics && (
        <div className="px-5 pb-2">
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: showLyrics ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)',
              color: showLyrics ? '#D4AF37' : 'rgba(255,255,255,0.55)',
              border: showLyrics ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            {showLyrics ? t.hideLyrics : t.showLyrics}
          </button>

          {showLyrics && (
            <div
              ref={lyricsRef}
              className="mt-2 p-4 rounded-2xl text-sm leading-7 max-h-52 overflow-y-auto fade-in"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.75)',
                /* Prevent text selection / copy */
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                /* Blur on screenshot attempt (CSS only hint) */
                pointerEvents: 'auto',
              }}
            >
              {currentSong.lyrics.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'h-3' : ''}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                >{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {queue.length > 0 && (
        <p className="text-center text-xs pb-4 mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {queue.length} {t.moreInQueue}
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
