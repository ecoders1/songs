'use client';

import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentSong, isPlaying, pauseSong, resumeSong, nextSong, currentTime, duration } = usePlayer();

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed left-0 right-0 z-40" style={{ bottom: 64 }}>

      {/* Thin gold progress bar */}
      <div className="h-0.5 w-full" style={{ background: 'rgba(0,0,0,0.05)' }}>
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
            transition: 'width 1s linear',   /* smooth 1-second tick */
          }}
        />
      </div>

      {/* Frosted glass bar */}
      <div
        className="flex items-center px-3 gap-3"
        style={{
          height: 60,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'saturate(180%) blur(24px)',
          WebkitBackdropFilter: 'saturate(180%) blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.07)',
        }}
      >
        {/* Album art / open full player */}
        <button
          onClick={() => router.push('/player')}
          aria-label="Open player"
          className="flex-shrink-0 overflow-hidden active:scale-95 transition-transform"
          style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1a2e' }}
        >
          {currentSong.image_url ? (
            <img src={currentSong.image_url} alt={currentSong.title} className="w-full h-full object-cover" />
          ) : currentSong.artist?.image_url ? (
            <img src={currentSong.artist.image_url} alt={currentSong.artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="15" height="15" fill="none" stroke="#D4AF37" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M9 18V5l12-2v13" strokeLinecap="round"/>
                <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          )}
        </button>

        {/* Song info */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => router.push('/player')}
        >
          <p className="font-semibold text-sm leading-tight truncate" style={{ color: '#111827' }}>
            {currentSong.title}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }}>
            {currentSong.artist?.name || 'Apostolic Songs'}
          </p>
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? pauseSong : resumeSong}
          className="flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37, #F0D060)',
            boxShadow: '0 2px 10px rgba(212,175,55,0.45)',
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="12" height="12" fill="#1a1a2e" viewBox="0 0 24 24">
              <rect x="6"  y="4" width="4" height="16" rx="1.5"/>
              <rect x="14" y="4" width="4" height="16" rx="1.5"/>
            </svg>
          ) : (
            <svg width="13" height="13" fill="#1a1a2e" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={nextSong}
          className="flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(0,0,0,0.05)',
          }}
          aria-label="Next song"
        >
          <svg width="14" height="14" fill="#6b7280" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
