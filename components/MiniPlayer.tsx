'use client';

import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentSong, isPlaying, pauseSong, resumeSong, nextSong, currentTime, duration } = usePlayer();

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed left-0 right-0 z-40"
      style={{ bottom: '64px' }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: '#e8e8f0' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: '#D4AF37' }}
        />
      </div>

      <div
        className="flex items-center px-4 py-2 gap-3"
        style={{ background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
      >
        {/* Album art - tappable to go to player */}
        <button
          onClick={() => router.push('/player')}
          className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden"
          style={{ background: '#1a1a2e' }}
          aria-label="Open player"
        >
          {currentSong.image_url ? (
            <img src={currentSong.image_url} alt={currentSong.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img src="/icons/church-logo.svg" alt="logo" className="w-full h-full object-cover opacity-80" />
            </div>
          )}
        </button>

        {/* Song info */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => router.push('/player')}
        >
          <p className="font-semibold text-sm text-gray-800 truncate">{currentSong.title}</p>
          <p className="text-xs text-gray-400 truncate">{currentSong.artist?.name || 'Unknown'}</p>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? pauseSong : resumeSong}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#D4AF37' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="14" height="14" fill="#1a1a2e" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="#1a1a2e" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={nextSong}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#f0f0f8' }}
            aria-label="Next song"
          >
            <svg width="14" height="14" fill="#888" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
