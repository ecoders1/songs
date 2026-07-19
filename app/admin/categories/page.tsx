'use client';

import { useState, useEffect } from 'react';
import type { Artist } from '@/lib/types';

const CATEGORIES = [
  { key: 'new', label: 'New Songs', emoji: '🎵', desc: 'Recently released songs' },
  { key: 'old', label: 'Old Songs', emoji: '📀', desc: 'Classic and timeless songs' },
  { key: 'single', label: 'Single Artists', emoji: '🎤', desc: 'Individual singers' },
  { key: 'group', label: 'Group / Choir', emoji: '👥', desc: 'Choirs and music groups' },
];

export default function AdminCategoriesPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('new');

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/artists?category=${selectedCategory}`);
        const data = await res.json();
        setArtists(data.artists || []);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, [selectedCategory]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <p className="text-sm text-gray-400 mt-0.5">Browse artists by category</p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className="p-4 rounded-2xl text-left transition-all shadow-sm"
            style={{
              background: selectedCategory === cat.key ? '#1a1a2e' : 'white',
              border: selectedCategory === cat.key ? '2px solid #D4AF37' : '2px solid transparent',
            }}
          >
            <div className="text-2xl mb-2">{cat.emoji}</div>
            <p className={`font-semibold text-sm ${selectedCategory === cat.key ? 'text-white' : 'text-gray-800'}`}>
              {cat.label}
            </p>
            <p className={`text-xs mt-0.5 ${selectedCategory === cat.key ? 'text-white/60' : 'text-gray-400'}`}>
              {cat.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Artist list for selected category */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-800 mb-3">
          {CATEGORIES.find((c) => c.key === selectedCategory)?.label} Artists
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl shimmer" />)}
          </div>
        ) : artists.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No artists in this category yet.</p>
        ) : (
          <div className="space-y-1">
            {artists.map((artist) => (
              <div key={artist.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#f0f0f8' }}>
                <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: '#f0f0f8' }}>
                  {artist.image_url ? (
                    <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">
                      {artist.is_group ? '👥' : '👤'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{artist.name}</p>
                  <p className="text-xs text-gray-400">{artist.is_group ? 'Group' : 'Solo artist'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
