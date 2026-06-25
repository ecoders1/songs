'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  totalSongs: number;
  totalArtists: number;
  newSongs: number;
  groupSongs: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalSongs: 0, totalArtists: 0, newSongs: 0, groupSongs: 0 });
  const [loading, setLoading] = useState(true);
  const [recentSongs, setRecentSongs] = useState<{ id: string; title: string; category: string; created_at: string }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [songsRes, artistsRes] = await Promise.all([
          fetch('/api/songs'),
          fetch('/api/artists'),
        ]);
        const { songs } = await songsRes.json();
        const { artists } = await artistsRes.json();

        setStats({
          totalSongs: songs?.length || 0,
          totalArtists: artists?.length || 0,
          newSongs: songs?.filter((s: { category: string }) => s.category === 'new').length || 0,
          groupSongs: artists?.filter((a: { is_group: boolean }) => a.is_group).length || 0,
        });
        setRecentSongs(songs?.slice(0, 5) || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Songs', value: stats.totalSongs, icon: '🎵', color: '#D4AF37' },
    { label: 'Total Artists', value: stats.totalArtists, icon: '👤', color: '#3B82F6' },
    { label: 'New Songs', value: stats.newSongs, icon: '✨', color: '#10B981' },
    { label: 'Group Artists', value: stats.groupSongs, icon: '👥', color: '#8B5CF6' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your music app</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-2xl mb-2">{card.icon}</div>
            {loading ? (
              <div className="h-7 w-12 rounded shimmer mb-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            )}
            <p className="text-xs text-gray-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/songs?action=add"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#D4AF37', color: '#1a1a2e' }}
          >
            ➕ Add Song
          </Link>
          <Link
            href="/admin/songs?action=add-artist"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#1a1a2e', color: 'white' }}
          >
            👤 Add Artist
          </Link>
        </div>
      </div>

      {/* Recent songs */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Recent Songs</h2>
          <Link href="/admin/songs" className="text-xs" style={{ color: '#D4AF37' }}>View all</Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-xl shimmer" />
            ))}
          </div>
        ) : recentSongs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No songs yet. Add your first song!</p>
        ) : (
          <div className="space-y-1">
            {recentSongs.map((song) => (
              <div key={song.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f0f0f8' }}>
                <span className="text-sm text-gray-800 truncate">{song.title}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 capitalize"
                  style={{ background: '#f0f0f8', color: '#666' }}
                >
                  {song.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
