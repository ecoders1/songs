'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        // Response wasn't JSON — show status
        setError(`Server error (${res.status}). Check Vercel environment variables.`);
        return;
      }

      if (!res.ok) {
        setError(data.error || `Login failed (${res.status})`);
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(`Connection failed — ${err instanceof Error ? err.message : 'check your internet'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#1a1a2e' }}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mx-auto mb-3">
          <rect x="25" y="4" width="6" height="48" rx="3" fill="#D4AF37" />
          <rect x="8" y="18" width="40" height="6" rx="3" fill="#D4AF37" />
        </svg>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-sm mt-1" style={{ color: '#D4AF37' }}>Faarfannaa Management</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Sign In</h2>
        <p className="text-sm text-gray-400 mb-5">Enter your admin credentials</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-red-600" style={{ background: '#FEF2F2' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
              style={{ borderColor: '#e8e8f0' }}
              onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
              onBlur={(e) => (e.target.style.borderColor = '#e8e8f0')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all pr-10"
                style={{ borderColor: '#e8e8f0' }}
                onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
                onBlur={(e) => (e.target.style.borderColor = '#e8e8f0')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2"
            style={{ background: loading ? '#e0c070' : '#D4AF37', color: '#1a1a2e' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
