'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import type { Song } from '@/lib/types';

export default function LibraryPage() {
  const router = useRouter();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLanguage, setActiveLanguage] = useState('all');

  const languages = ['all', 'oromo', 'english', 'amharic', 'sidama', 'arabic'];

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      try {
        const url = activeLanguage === 'all' ? '/api/songs' : `/api/songs?language=${activeLanguage}`;
        const res = await fetch(url);
        const data = await res.json();
        setSongs(data.songs || []);
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, [activeLanguage]);

  const formatDuration = (sec: number | null) => {
    if (!sec) return '';
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ background: '#1a1a2e' }}>
        <h1 className="text-xl font-bold text-white mb-4">Library</h1>
        {/* Language filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLanguage(lang)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
              style={
                activeLanguage === lang
                  ? { background: '#D4AF37', color: '#1a1a2e' }
                  : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
              }
            >
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
            <p>No songs found</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">{songs.length} songs</p>
            <div className="space-y-1 fade-in">
              {songs.map((song) => {
                const isActive = currentSong?.id === song.id;
                return (
                  <button
                    key={song.id}
                    onClick={() => { playSong(song, songs); router.push('/player'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: isActive ? '#FFF8E7' : 'transparent' }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: isActive ? '#D4AF37' : '#f0f0f8' }}
                    >
                      {song.image_url ? (
                        <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <svg width="20" height="20" fill="none" stroke={isActive ? '#1a1a2e' : '#D4AF37'} strokeWidth="1.8" viewBox="0 0 24 24">
                          <path d="M9 18V5l12-2v13" strokeLinecap="round" />
                          <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
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
                    {isActive && isPlaying && (
                      <div className="flex gap-0.5 items-end h-4">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full"
                            style={{
                              height: `${(i + 1) * 4}px`,
                              background: '#D4AF37',
                              animation: `pulse 0.8s ease-in-out ${i * 0.2}s infinite alternate`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {song.duration && !isActive && (
                      <span className="text-xs text-gray-400">{formatDuration(song.duration)}</span>
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
