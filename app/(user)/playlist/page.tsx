'use client';

import { useState, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useRouter } from 'next/navigation';
import type { Song } from '@/lib/types';

export default function PlaylistPage() {
  const router = useRouter();
  const { queue, currentSong, playSong, clearQueue } = usePlayer();
  const [shareMsg, setShareMsg] = useState('');

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Faarfannaa - Apostolic Songs Afaan Oromoo',
          text: 'Listen to Apostolic Songs in Afaan Oromoo',
          url: window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        setShareMsg('Link copied!');
        setTimeout(() => setShareMsg(''), 2000);
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Queue</h1>
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Currently playing */}
        {currentSong && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Now Playing</p>
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: '#FFF8E7' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{ background: '#D4AF37' }}
              >
                {currentSong.image_url ? (
                  <img src={currentSong.image_url} alt={currentSong.title} className="w-full h-full object-cover" />
                ) : (
                  <svg width="20" height="20" fill="#1a1a2e" viewBox="0 0 24 24">
                    <path d="M9 18V5l12-2v13" strokeLinecap="round" stroke="#1a1a2e" strokeWidth="1.8" fill="none" />
                    <circle cx="6" cy="18" r="3" fill="#1a1a2e" />
                    <circle cx="18" cy="16" r="3" fill="#1a1a2e" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-yellow-700">{currentSong.title}</p>
                <p className="text-xs text-gray-400 truncate">{currentSong.artist?.name}</p>
              </div>
              <button onClick={() => router.push('/player')}>
                <svg width="20" height="20" fill="none" stroke="#D4AF37" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M10 8l6 4-6 4V8z" fill="#D4AF37" stroke="none" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Queue */}
        {queue.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Up Next ({queue.length})</p>
            <div className="space-y-1">
              {queue.map((song, i) => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8f8fc' }}>
                  <span className="text-sm font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-gray-800">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !currentSong && (
            <div className="text-center py-16 text-gray-400">
              <svg className="mx-auto mb-3" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
              </svg>
              <p className="font-medium">Queue is empty</p>
              <p className="text-sm mt-1">Play a song to get started</p>
              <button
                onClick={() => router.push('/home')}
                className="mt-4 px-5 py-2.5 rounded-full text-sm font-medium"
                style={{ background: '#D4AF37', color: '#1a1a2e' }}
              >
                Browse Songs
              </button>
            </div>
          )
        )}

        {/* Share app */}
        <div className="mt-8 p-4 rounded-2xl" style={{ background: '#f0f0f8' }}>
          <h3 className="font-semibold text-gray-800 mb-1">Share App</h3>
          <p className="text-sm text-gray-400 mb-3">Share Faarfannaa with your community</p>
          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={{ background: '#D4AF37', color: '#1a1a2e' }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share App Link
          </button>
          {shareMsg && <p className="text-center text-sm mt-2 text-green-600">{shareMsg}</p>}
        </div>
      </div>
    </div>
  );
}
