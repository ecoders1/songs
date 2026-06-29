'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import Image from 'next/image';
import type { Artist, Song } from '@/lib/types';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { playSong, currentSong, isPlaying, pauseSong, resumeSong } = usePlayer();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [ar, sr] = await Promise.all([
          fetch(`/api/artists/${id}`),
          fetch(`/api/songs?artist_id=${id}`),
        ]);
        const { artist } = await ar.json();
        const { songs } = await sr.json();
        setArtist(artist || null);
        setSongs(songs || []);
      } catch {
        setArtist(null); setSongs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Click a track → play it + open full player
  const handleTrackClick = (song: Song, idx: number) => {
    const rest = songs.filter((_, i) => i !== idx); // remaining songs as queue
    if (currentSong?.id === song.id) {
      // same song — toggle play/pause, go to player
      isPlaying ? pauseSong() : resumeSong();
      router.push('/player');
    } else {
      playSong(song, rest);
      router.push('/player');
    }
  };

  const fmt = (sec: number | null) => {
    if (!sec) return '';
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-52 shimmer" />
        <div className="p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8f8fc' }}>
              <div className="w-12 h-12 rounded-xl shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded shimmer w-3/4" />
                <div className="h-3 rounded shimmer w-1/3" />
              </div>
              <div className="h-3 rounded shimmer w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Artist not found</p>
          <button onClick={() => router.back()} className="mt-4 text-sm underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-52" style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f3460 100%)' }}>
        {artist.image_url && (
          <img src={artist.image_url} alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover opacity-25" />
        )}

        {/* Back */}
        <button onClick={() => router.back()}
          className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Artist info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
          <div className="flex items-end gap-3">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2"
              style={{ borderColor: 'rgba(212,175,55,0.5)', background: '#1a2744' }}>
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image src="/icons/icon.png" alt="logo" width={40} height={40} className="w-10 h-10 opacity-70" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#D4AF37' }}>
                {artist.is_group ? '👥 Group' : '🎤 Artist'}
              </p>
              <h1 className="text-xl font-bold text-white leading-tight">{artist.name}</h1>
              <p className="text-xs text-white/50 mt-0.5">
                {songs.length} track{songs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Play All */}
      {songs.length > 0 && (
        <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: '#f0f0f8' }}>
          <button
            onClick={() => { playSong(songs[0], songs.slice(1)); router.push('/player'); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95"
            style={{ background: '#D4AF37', color: '#1a1a2e' }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play All
          </button>
          <span className="text-sm text-gray-400">{songs.length} songs</span>
        </div>
      )}

      {/* Track list */}
      <div className="pb-6">
        {songs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="mx-auto mb-3" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <p>No songs yet</p>
          </div>
        ) : (
          songs.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            return (
              <button
                key={song.id}
                onClick={() => handleTrackClick(song, idx)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 active:bg-yellow-50 border-b"
                style={{
                  background: isActive ? '#FFFBEB' : 'white',
                  borderColor: '#f5f5f5',
                }}
              >
                {/* Track badge */}
                <div
                  className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
                  style={{
                    background: isActive ? '#D4AF37' : '#f0f0f8',
                    color: isActive ? '#1a1a2e' : '#aaa',
                  }}
                >
                  {isActive && isPlaying ? (
                    /* Animated bars when playing */
                    <div className="flex gap-0.5 items-end h-4">
                      {[3, 5, 4].map((h, i) => (
                        <div key={i} className="w-1 rounded-full"
                          style={{ height: `${h * 2}px`, background: '#1a1a2e',
                            animation: `bounce ${0.6 + i * 0.15}s ease-in-out infinite alternate` }} />
                      ))}
                    </div>
                  ) : (
                    song.track_number
                  )}
                </div>

                {/* Cover art or music note */}
                <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden"
                  style={{ background: '#e8e8f5' }}>
                  {song.image_url ? (
                    <img src={song.image_url} alt={song.title} className="w-full h-full object-cover" />
                  ) : artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="18" height="18" fill="none" stroke="#D4AF37" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M9 18V5l12-2v13" strokeLinecap="round" />
                        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate"
                    style={{ color: isActive ? '#B8960C' : '#1a1a2e' }}>
                    {song.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{song.language}</p>
                </div>

                {/* Duration + play chevron */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {song.duration && (
                    <span className="text-xs text-gray-300">{fmt(song.duration)}</span>
                  )}
                  <svg width="16" height="16" fill="none"
                    stroke={isActive ? '#D4AF37' : '#ddd'} strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes bounce {
          from { transform: scaleY(0.6); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}
