'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/context/UserContext';

export default function PendingPage() {
  const router = useRouter();
  const { user, loading, refetch, logout } = useUser();
  const [checking, setChecking] = useState(false);

  // Poll every 8 seconds to check if admin approved
  useEffect(() => {
    if (!user) return;
    if (user.status === 'approved') { router.replace('/home'); return; }

    const interval = setInterval(async () => {
      setChecking(true);
      await refetch();
      setChecking(false);
    }, 8000);

    return () => clearInterval(interval);
  }, [user, refetch, router]);

  // Also redirect immediately if status changes
  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (user?.status === 'approved') router.replace('/home');
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth');
  };

  if (loading) return null;

  const isRejected = user?.status === 'rejected';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 50%, #0f3460 100%)' }}
    >
      <div
        className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6"
        style={{ border: '2px solid rgba(212,175,55,0.5)' }}
      >
        <Image src="/icons/icon.png" alt="Apostolic Songs" width={80} height={80} className="w-full h-full object-cover" />
      </div>

      {isRejected ? (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(220,38,38,0.15)', border: '2px solid rgba(220,38,38,0.4)' }}>
            <svg width="32" height="32" fill="none" stroke="#DC2626" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Rejected</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Your account request was not approved. Contact the church administrator for more information.
          </p>
        </>
      ) : (
        <>
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(212,175,55,0.3)', borderTopColor: '#D4AF37' }} />
            {checking && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Waiting for Approval</h2>
          <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Hi <span style={{ color: '#D4AF37' }}>{user?.full_name}</span>, your account is under review.
          </p>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            An admin will approve your account soon. This page checks automatically every 8 seconds.
          </p>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#EAB308',
              animation: 'pulse 2s ease-in-out infinite' }} />
            <span className="text-xs" style={{ color: '#EAB308' }}>Pending Approval</span>
          </div>
        </>
      )}

      <button
        onClick={handleLogout}
        className="px-6 py-2.5 rounded-full text-sm font-medium"
        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(255,255,255,0.15)' }}
      >
        Sign Out
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
