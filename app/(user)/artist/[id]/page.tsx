'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
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
    const fetchData = async () => {
      setLoading(true);
      try {
        const [artistRes, songsRes] = await Promise.all([
          fetch(`/api/artists/${id}`),
          fetch(`/api/songs?artist_id=${id}`),
        ]);
        const artistData = await artistRes.json();
        const songsData = await songsRes.json();
        setArtist(artistData.artist || null);
        setSongs(songsData.songs || []);
      } catch {
        setArtist(null);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      isPlaying ? pauseSong() : resumeSong();
    } else {
      playSong(song, songs);
      router.push('/player');
    }
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-48 shimmer" />
        <div className="p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded shimmer w-3/4" />
                <div className="h-3 rounded shimmer w-1/4" />
              </div>
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
      <div className="relative">
        <div
          className="h-48 flex items-end"
          style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #0f3460 100%)' }}
        >
          {artist.image_url && (
            <img
              src={artist.image_url}
              alt={artist.name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="relative p-4 pb-5 w-full">
            <p className="text-xs font-medium mb-1" style={{ color: '#D4AF37' }}>
              {artist.is_group ? '👥 Group' : '🎤 Artist'}
            </p>
            <h1 className="text-2xl font-bold text-white">{artist.name}</h1>
            <p className="text-sm text-white/60 mt-1">{songs.length} track{songs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Play all button */}
      {songs.length > 0 && (
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => { playSong(songs[0], songs.slice(1)); router.push('/player'); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all"
            style={{ background: '#D4AF37', color: '#1a1a2e' }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play All
          </button>
          <span className="text-sm text-gray-400">{songs.length} songs</span>
        </div>
      )}

      {/* Track list */}
      <div className="px-4 pb-4">
        {songs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="mx-auto mb-2" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <p>No songs yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {songs.map((song, index) => {
              const isCurrentSong = currentSong?.id === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() => handlePlay(song)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 active:scale-98"
                  style={{ background: isCurrentSong ? '#FFF8E7' : 'transparent' }}
                >
                  {/* Track number / play icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ background: isCurrentSong ? '#D4AF37' : '#f0f0f8', color: isCurrentSong ? '#1a1a2e' : '#888' }}
                  >
                    {isCurrentSong && isPlaying ? (
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      song.track_number
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate text-sm"
                      style={{ color: isCurrentSong ? '#D4AF37' : '#1a1a2e' }}
                    >
                      {song.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{song.language}</p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDuration(song.duration)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
