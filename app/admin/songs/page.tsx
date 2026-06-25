'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Song, Artist } from '@/lib/types';

type FormMode = 'none' | 'add-artist' | 'edit-artist' | 'add-song' | 'edit-song';

interface FormData {
  // artist fields
  artistName: string;
  artistBio: string;
  artistIsGroup: boolean;
  artistCategory: string;
  artistImageFile: File | null;
  artistImageUrl: string;
  // song fields
  songTitle: string;
  songArtistId: string;
  songTrackNumber: number;
  songCategory: string;
  songLanguage: string;
  songLyrics: string;
  songAudioFile: File | null;
  songAudioUrl: string;
  songImageFile: File | null;
  songImageUrl: string;
}

const defaultForm: FormData = {
  artistName: '', artistBio: '', artistIsGroup: false, artistCategory: 'single',
  artistImageFile: null, artistImageUrl: '',
  songTitle: '', songArtistId: '', songTrackNumber: 1, songCategory: 'new',
  songLanguage: 'oromo', songLyrics: '', songAudioFile: null, songAudioUrl: '',
  songImageFile: null, songImageUrl: '',
};

export default function AdminSongsPage() {
  const searchParams = useSearchParams();
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [form, setForm] = useState<FormData>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'songs' | 'artists'>('songs');
  const [uploadProgress, setUploadProgress] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [songsRes, artistsRes] = await Promise.all([
        fetch('/api/songs'),
        fetch('/api/artists'),
      ]);
      const { songs } = await songsRes.json();
      const { artists } = await artistsRes.json();
      setSongs(songs || []);
      setArtists(artists || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-open form based on URL param (?action=add or ?action=add-artist)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setFormMode('add-song');
      setForm(defaultForm);
      setEditingId(null);
    } else if (action === 'add-artist') {
      setFormMode('add-artist');
      setForm(defaultForm);
      setEditingId(null);
      setActiveTab('artists');
    }
  }, [searchParams]);

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', bucket);
    setUploadProgress(`Uploading ${file.name}...`);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploadProgress('');
    if (!res.ok) throw new Error(data.error);
    return data.url;
  };

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = form.artistImageUrl;
      if (form.artistImageFile) {
        imageUrl = await uploadFile(form.artistImageFile, 'images');
      }

      const payload = {
        name: form.artistName,
        bio: form.artistBio,
        is_group: form.artistIsGroup,
        category: form.artistCategory,
        image_url: imageUrl || null,
      };

      const url = editingId ? `/api/artists/${editingId}` : '/api/artists';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      showMsg(editingId ? 'Artist updated!' : 'Artist added!');
      setFormMode('none');
      setForm(defaultForm);
      setEditingId(null);
      fetchData();
    } catch (err) {
      showMsg(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let audioUrl = form.songAudioUrl;
      let imageUrl = form.songImageUrl;

      if (form.songAudioFile) {
        audioUrl = await uploadFile(form.songAudioFile, 'audio');
      }
      if (form.songImageFile) {
        imageUrl = await uploadFile(form.songImageFile, 'images');
      }

      if (!audioUrl && !editingId) throw new Error('Audio file is required');

      const payload = {
        title: form.songTitle,
        artist_id: form.songArtistId,
        audio_url: audioUrl,
        image_url: imageUrl || null,
        lyrics: form.songLyrics || null,
        track_number: form.songTrackNumber,
        category: form.songCategory,
        language: form.songLanguage,
      };

      const url = editingId ? `/api/songs/${editingId}` : '/api/songs';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      showMsg(editingId ? 'Song updated!' : 'Song added!');
      setFormMode('none');
      setForm(defaultForm);
      setEditingId(null);
      fetchData();
    } catch (err) {
      showMsg(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (!confirm('Delete this song?')) return;
    const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
    if (res.ok) { showMsg('Song deleted'); fetchData(); }
  };

  const handleDeleteArtist = async (id: string) => {
    if (!confirm('Delete this artist and ALL their songs?')) return;
    const res = await fetch(`/api/artists/${id}`, { method: 'DELETE' });
    if (res.ok) { showMsg('Artist deleted'); fetchData(); }
  };

  const startEditSong = (song: Song) => {
    setForm({
      ...defaultForm,
      songTitle: song.title,
      songArtistId: song.artist_id,
      songTrackNumber: song.track_number,
      songCategory: song.category,
      songLanguage: song.language,
      songLyrics: song.lyrics || '',
      songAudioUrl: song.audio_url,
      songImageUrl: song.image_url || '',
    });
    setEditingId(song.id);
    setFormMode('edit-song');
  };

  const startEditArtist = (artist: Artist) => {
    setForm({
      ...defaultForm,
      artistName: artist.name,
      artistBio: artist.bio || '',
      artistIsGroup: artist.is_group,
      artistCategory: artist.category,
      artistImageUrl: artist.image_url || '',
    });
    setEditingId(artist.id);
    setFormMode('edit-artist');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Content Manager</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage songs and artists</p>
        </div>
      </div>

      {/* Success/error message */}
      {msg && (
        <div
          className="mb-4 p-3 rounded-xl text-sm font-medium"
          style={{ background: msg.startsWith('Error') ? '#FEF2F2' : '#F0FDF4', color: msg.startsWith('Error') ? '#DC2626' : '#16A34A' }}
        >
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['songs', 'artists'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={activeTab === tab ? { background: '#D4AF37', color: '#1a1a2e' } : { background: '#f0f0f8', color: '#666' }}
          >
            {tab} ({tab === 'songs' ? songs.length : artists.length})
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setFormMode('add-song'); setForm(defaultForm); setEditingId(null); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: '#D4AF37', color: '#1a1a2e' }}
        >
          ➕ Add Song
        </button>
        <button
          onClick={() => { setFormMode('add-artist'); setForm(defaultForm); setEditingId(null); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: '#1a1a2e', color: 'white' }}
        >
          👤 Add Artist
        </button>
      </div>

      {/* Form overlay */}
      {formMode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl my-4">
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#f0f0f8' }}>
              <h2 className="font-bold text-gray-800">
                {formMode === 'add-artist' ? 'Add Artist / Group' :
                 formMode === 'edit-artist' ? 'Edit Artist' :
                 formMode === 'add-song' ? 'Add Song' : 'Edit Song'}
              </h2>
              <button onClick={() => { setFormMode('none'); setEditingId(null); }} className="text-gray-400 text-xl">✕</button>
            </div>

            <div className="p-4">
              {(formMode === 'add-artist' || formMode === 'edit-artist') ? (
                <form onSubmit={handleArtistSubmit} className="space-y-4">
                  <InputField label="Name *" value={form.artistName} onChange={(v) => setForm((f) => ({ ...f, artistName: v }))} required />
                  <InputField label="Bio" value={form.artistBio} onChange={(v) => setForm((f) => ({ ...f, artistBio: v }))} multiline />
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Category</label>
                    <select
                      value={form.artistCategory}
                      onChange={(e) => setForm((f) => ({ ...f, artistCategory: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#e8e8f0' }}
                    >
                      <option value="new">New</option>
                      <option value="old">Old</option>
                      <option value="single">Single</option>
                      <option value="group">Group</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.artistIsGroup}
                      onChange={(e) => setForm((f) => ({ ...f, artistIsGroup: e.target.checked }))}
                      className="w-4 h-4 accent-yellow-400"
                    />
                    <span className="text-gray-700">This is a group / choir</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm((f) => ({ ...f, artistImageFile: e.target.files?.[0] || null }))}
                      className="w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700"
                    />
                  </div>
                  {uploadProgress && <p className="text-sm text-blue-500">{uploadProgress}</p>}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => { setFormMode('none'); setEditingId(null); }} className="flex-1 py-2.5 rounded-xl text-sm border" style={{ borderColor: '#e8e8f0' }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#D4AF37', color: '#1a1a2e' }}>
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSongSubmit} className="space-y-4">
                  <InputField label="Title *" value={form.songTitle} onChange={(v) => setForm((f) => ({ ...f, songTitle: v }))} required />
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Artist *</label>
                    <select
                      value={form.songArtistId}
                      onChange={(e) => setForm((f) => ({ ...f, songArtistId: e.target.value }))}
                      required
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#e8e8f0' }}
                    >
                      <option value="">Select artist...</option>
                      {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Track #</label>
                      <input
                        type="number" min={1} max={15}
                        value={form.songTrackNumber}
                        onChange={(e) => setForm((f) => ({ ...f, songTrackNumber: Number(e.target.value) }))}
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                        style={{ borderColor: '#e8e8f0' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Category</label>
                      <select
                        value={form.songCategory}
                        onChange={(e) => setForm((f) => ({ ...f, songCategory: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                        style={{ borderColor: '#e8e8f0' }}
                      >
                        <option value="new">New</option>
                        <option value="old">Old</option>
                        <option value="single">Single</option>
                        <option value="group">Group</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Language</label>
                    <select
                      value={form.songLanguage}
                      onChange={(e) => setForm((f) => ({ ...f, songLanguage: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                      style={{ borderColor: '#e8e8f0' }}
                    >
                      <option value="oromo">Afaan Oromoo</option>
                      <option value="english">English</option>
                      <option value="amharic">Amharic</option>
                      <option value="sidama">Sidama</option>
                      <option value="arabic">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Audio File {!editingId && '*'}</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setForm((f) => ({ ...f, songAudioFile: e.target.files?.[0] || null }))}
                      required={!editingId}
                      className="w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Cover Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm((f) => ({ ...f, songImageFile: e.target.files?.[0] || null }))}
                      className="w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700"
                    />
                  </div>
                  <InputField
                    label="Lyrics"
                    value={form.songLyrics}
                    onChange={(v) => setForm((f) => ({ ...f, songLyrics: v }))}
                    multiline
                    rows={6}
                  />
                  {uploadProgress && <p className="text-sm text-blue-500">{uploadProgress}</p>}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => { setFormMode('none'); setEditingId(null); }} className="flex-1 py-2.5 rounded-xl text-sm border" style={{ borderColor: '#e8e8f0' }}>Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#D4AF37', color: '#1a1a2e' }}>
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
      ) : activeTab === 'songs' ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {songs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No songs yet. Add your first song!</p>
            </div>
          ) : songs.map((song, i) => (
            <div key={song.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: '#f0f0f8' }}>
              <span className="text-sm font-bold text-gray-300 w-6 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">{song.title}</p>
                <p className="text-xs text-gray-400">{song.artist?.name} · Track {song.track_number} · {song.language}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: '#f0f0f8', color: '#666' }}>{song.category}</span>
              <div className="flex gap-1">
                <button onClick={() => startEditSong(song)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button onClick={() => handleDeleteSong(song.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {artists.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No artists yet. Add your first artist!</p>
            </div>
          ) : artists.map((artist, i) => (
            <div key={artist.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: '#f0f0f8' }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: '#f0f0f8' }}>
                {artist.image_url ? (
                  <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    {artist.is_group ? '👥' : '👤'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">{artist.name}</p>
                <p className="text-xs text-gray-400 capitalize">{artist.is_group ? 'Group' : 'Artist'} · {artist.category}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEditArtist(artist)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button onClick={() => handleDeleteArtist(artist.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputField({
  label, value, onChange, required, multiline, rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  const style = { borderColor: '#e8e8f0' };
  const cls = "w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none";
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cls} style={style} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required} className={cls} style={style} />
      )}
    </div>
  );
}
