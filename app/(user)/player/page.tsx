'use client';

import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import { useState } from 'react';

export default function PlayerPage() {
  const router = useRouter();
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    pauseSong, resumeSong, nextSong, prevSong, seekTo, setVolume,
    downloadSong, queue,
  } = usePlayer();
  const [showLyrics, setShowLyrics] = useState(false);

  if (!currentSong) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <svg width="60" height="60" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M9 18V5l12-2v13" strokeLinecap="round" />
          <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <p className="mt-4 text-gray-400">No song playing</p>
        <button onClick={() => router.push('/home')} className="mt-4 text-sm" style={{ color: '#D4AF37' }}>
          Browse Songs
        </button>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-xs text-white/50">Now Playing</p>
          <p className="text-sm font-medium text-white truncate max-w-40">
            {currentSong.artist?.name || 'Unknown'}
          </p>
        </div>
        <button
          onClick={() => downloadSong(currentSong)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          aria-label="Download song"
        >
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Album art */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div
          className="w-64 h-64 rounded-2xl flex items-center justify-center overflow-hidden mb-6"
          style={{
            background: 'linear-gradient(135deg, #16213e, #0f3460)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          {currentSong.image_url ? (
            <img
              src={currentSong.image_url}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg width="80" height="80" fill="none" stroke="#D4AF37" strokeWidth="1.2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 9V5M12 19v-4M9 12H5M19 12h-4" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Song info */}
        <div className="text-center w-full max-w-xs">
          <h2 className="text-xl font-bold text-white truncate">{currentSong.title}</h2>
          <p className="text-sm mt-1" style={{ color: '#D4AF37' }}>
            {currentSong.artist?.name || 'Unknown Artist'}
          </p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-xs mt-6">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#D4AF37' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <button
            onClick={prevSong}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            aria-label="Previous"
          >
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={isPlaying ? pauseSong : resumeSong}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="24" height="24" fill="#1a1a2e" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="#1a1a2e" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={nextSong}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            aria-label="Next"
          >
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full max-w-xs mt-6">
          <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: '#D4AF37' }}
          />
          <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Lyrics toggle */}
      {currentSong.lyrics && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: showLyrics ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.08)',
              color: showLyrics ? '#D4AF37' : 'rgba(255,255,255,0.6)',
            }}
          >
            {showLyrics ? 'Hide Lyrics' : '🎵 Show Lyrics'}
          </button>
          {showLyrics && (
            <div
              className="mt-3 p-4 rounded-xl text-sm leading-relaxed max-h-48 overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}
            >
              {currentSong.lyrics.split('\n').map((line, i) => (
                <p key={i} className={line === '' ? 'h-3' : ''}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Queue count */}
      {queue.length > 0 && (
        <div className="px-4 pb-6">
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {queue.length} song{queue.length !== 1 ? 's' : ''} in queue
          </p>
        </div>
      )}
    </div>
  );
}
