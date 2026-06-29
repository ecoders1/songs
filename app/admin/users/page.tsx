'use client';

import { useState, useEffect, useCallback } from 'react';

type UserStatus = 'pending' | 'approved' | 'rejected';

interface AppUser {
  id: string;
  full_name: string;
  email: string;
  status: UserStatus;
  device_id: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  reset_at: string | null;
}

const STATUS_COLORS: Record<UserStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: '#FFF3CD', text: '#856404', label: 'Pending'  },
  approved: { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
};

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<AppUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilter]   = useState<UserStatus | 'all'>('all');
  const [search, setSearch]         = useState('');
  const [msg, setMsg]               = useState('');
  const [actioning, setActioning]   = useState<string | null>(null);

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [filterStatus, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'reset') => {
    setActioning(id + action);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) { showMsg(`Error: ${data.error}`); return; }
      showMsg(`User ${action}d successfully`);
      fetchUsers();
    } catch { showMsg('Action failed'); }
    finally { setActioning(null); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setActioning(id + 'delete');
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (res.ok) { showMsg('User deleted'); fetchUsers(); }
      else { const d = await res.json(); showMsg(`Error: ${d.error}`); }
    } catch { showMsg('Delete failed'); }
    finally { setActioning(null); }
  };

  const counts = { all: users.length };

  const fmtDate = (s: string | null) => {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage user registrations</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-3 py-1.5 rounded-xl text-sm font-medium"
          style={{ background: '#f0f0f8', color: '#666' }}
        >
          🔄 Refresh
        </button>
      </div>

      {msg && (
        <div
          className="mb-4 p-3 rounded-xl text-sm font-medium"
          style={{ background: msg.startsWith('Error') ? '#FEF2F2' : '#F0FDF4',
            color: msg.startsWith('Error') ? '#DC2626' : '#16A34A' }}
        >
          {msg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={filterStatus === s
              ? { background: '#D4AF37', color: '#1a1a2e' }
              : { background: '#f0f0f8', color: '#666' }}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" fill="none"
          stroke="#999" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
          style={{ borderColor: '#e8e8f0' }}
          onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
          onBlur={(e) => (e.target.style.borderColor = '#e8e8f0')}
        />
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl">
          <p className="text-lg">👥</p>
          <p className="mt-2">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {users.map((u, i) => {
            const sc = STATUS_COLORS[u.status];
            const busy = actioning?.startsWith(u.id);
            return (
              <div
                key={u.id}
                className="px-4 py-4 border-b last:border-0"
                style={{ borderColor: '#f0f0f8' }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                    style={{ background: '#1a1a2e' }}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{u.full_name}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email}</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Registered {fmtDate(u.created_at)}
                      {u.approved_at && ` · Approved ${fmtDate(u.approved_at)}`}
                      {u.rejected_at && ` · Rejected ${fmtDate(u.rejected_at)}`}
                      {u.reset_at && ` · Reset ${fmtDate(u.reset_at)}`}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {u.status !== 'approved' && (
                    <ActionBtn
                      label="✓ Approve"
                      color="#16A34A"
                      bg="#F0FDF4"
                      disabled={!!busy}
                      loading={actioning === u.id + 'approve'}
                      onClick={() => handleAction(u.id, 'approve')}
                    />
                  )}
                  {u.status !== 'rejected' && (
                    <ActionBtn
                      label="✕ Reject"
                      color="#DC2626"
                      bg="#FEF2F2"
                      disabled={!!busy}
                      loading={actioning === u.id + 'reject'}
                      onClick={() => handleAction(u.id, 'reject')}
                    />
                  )}
                  {u.status !== 'pending' && (
                    <ActionBtn
                      label="↺ Reset"
                      color="#D97706"
                      bg="#FFFBEB"
                      disabled={!!busy}
                      loading={actioning === u.id + 'reset'}
                      onClick={() => handleAction(u.id, 'reset')}
                    />
                  )}
                  <ActionBtn
                    label="🗑 Delete"
                    color="#6B7280"
                    bg="#F9FAFB"
                    disabled={!!busy}
                    loading={actioning === u.id + 'delete'}
                    onClick={() => handleDelete(u.id, u.full_name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && users.length > 0 && (
        <p className="text-center text-xs text-gray-300 mt-4">{users.length} user{users.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

function ActionBtn({
  label, color, bg, onClick, disabled, loading,
}: {
  label: string; color: string; bg: string;
  onClick: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
      style={{ background: bg, color, opacity: disabled ? 0.6 : 1 }}
    >
      {loading ? '…' : label}
    </button>
  );
}
