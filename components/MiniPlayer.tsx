'use client';

import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentSong, isPlaying, pauseSong, resumeSong, nextSong, currentTime, duration } = usePlayer();

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed left-0 right-0 z-40" style={{ bottom: '64px' }}>
      {/* Thin progress bar on top */}
      <div className="h-0.5 w-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <div className="h-full transition-all duration-500 ease-linear"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #D4AF37, #F0D060)' }} />
      </div>

      <div className="flex items-center px-3 gap-3"
        style={{
          height: 60,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
        }}>

        {/* Album art */}
        <button onClick={() => router.push('/player')} aria-label="Open player"
          className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden active:scale-95 transition-transform"
          style={{ background: '#1a1a2e' }}>
          {currentSong.image_url ? (
            <img src={currentSong.image_url} alt={currentSong.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="16" height="16" fill="none" stroke="#D4AF37" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M9 18V5l12-2v13" strokeLinecap="round" />
                <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
        </button>

        {/* Song info */}
        <button className="flex-1 min-w-0 text-left" onClick={() => router.push('/player')}>
          <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{currentSong.title}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{currentSong.artist?.name || 'Apostolic Songs'}</p>
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? pauseSong : resumeSong}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }}
          aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <svg width="13" height="13" fill="#1a1a2e" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="#1a1a2e" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <button onClick={nextSong}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: '#f0f0f8' }}
          aria-label="Next">
          <svg width="14" height="14" fill="#666" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
