'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser, getDeviceId } from '@/context/UserContext';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, refetch } = useUser();
  const [mode, setMode] = useState<Mode>('login');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // If already logged in, redirect
  useEffect(() => {
    if (!loading && user) {
      if (user.status === 'approved') router.replace('/home');
      else router.replace('/pending');
    }
  }, [user, loading, router]);

  // Validation helpers
  const validate = (): string | null => {
    if (mode === 'register') {
      if (fullName.trim().length < 6) return 'Full name must be at least 6 characters';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
    if (password.length < 5) return 'Password must be at least 5 characters';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const err = validate();
    if (err) { setError(err); return; }

    setSubmitting(true);
    const device_id = getDeviceId();

    try {
      const url  = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register'
        ? { full_name: fullName.trim(), email: email.trim().toLowerCase(), password, device_id }
        : { email: email.trim().toLowerCase(), password, device_id };

      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      await refetch();

      const status = data.user?.status;

      // Always set the flag — InstallPrompt on home page handles the full flow
      // (shows full-screen card first, then triggers native prompt on button tap)
      sessionStorage.setItem('show_install_prompt', '1');

      if (status === 'approved') {
        router.replace('/home');
      } else {
        router.replace('/pending');
      }
    } catch {
      setError('Connection failed. Please check your internet.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 50%, #0f3460 100%)' }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div
          className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4"
          style={{ border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 0 30px rgba(212,175,55,0.2)' }}
        >
          <Image src="/icons/icon.png" alt="Apostolic Songs" width={80} height={80} className="w-full h-full object-cover" priority />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Apostolic Songs</h1>
        <p className="text-sm mt-1" style={{ color: '#D4AF37' }}>Afaan Oromo · Church Music</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden mb-5 p-1 gap-1" style={{ background: '#e8e8f0' }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              className="flex-1 py-2.5 text-sm font-bold transition-all rounded-lg"
              style={{
                background: mode === m ? '#000000' : '#ffffff',
                color:      mode === m ? '#ffffff' : '#000000',
                boxShadow:  mode === m ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-red-600" style={{ background: '#FEF2F2' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl text-sm text-green-700" style={{ background: '#F0FDF4' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name — register only */}
          {mode === 'register' && (
            <Field
              label="Full Name"
              hint="Minimum 6 characters"
              value={fullName}
              onChange={setFullName}
              placeholder="e.g. Milki Faarfataa"
              minLength={6}
              required
            />
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            required
          />

          {/* Password with toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Password
              <span className="ml-1 text-xs text-gray-400">(min 5 chars)</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={5}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none pr-10"
                style={{ borderColor: '#e8e8f0' }}
                onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
                onBlur={(e)  => (e.target.style.borderColor = '#e8e8f0')}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Toggle password"
              >
                {showPw ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <p className="text-xs text-gray-400 leading-relaxed">
              ⚠️ One account per device. Your registration will be reviewed by an admin before you can access songs.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all mt-1"
            style={{
              background: submitting ? '#e0c070' : '#D4AF37',
              color: '#1a1a2e',
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting
              ? (mode === 'login' ? 'Signing in...' : 'Registering...')
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="font-semibold underline"
            style={{ color: '#D4AF37' }}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Apostolic Church · Afaan Oromoo
      </p>
    </div>
  );
}

function Field({
  label, hint, value, onChange, placeholder, type = 'text', required, minLength,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">
        {label}
        {hint && <span className="ml-1 text-xs text-gray-400">({hint})</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
        style={{ borderColor: '#e8e8f0' }}
        onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
        onBlur={(e)  => (e.target.style.borderColor = '#e8e8f0')}
      />
    </div>
  );
}
