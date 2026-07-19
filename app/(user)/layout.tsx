'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import MiniPlayer from '@/components/MiniPlayer';
import PWAInstallBanner from '@/components/PWAInstallBanner';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { t } = useLanguage();

  const NAV = [
    {
      href: '/home',
      label: t.home,
      icon: (a: boolean) => (
        <svg width="22" height="22"
          fill={a ? '#D4AF37' : 'none'}
          stroke={a ? '#D4AF37' : '#9ca3af'}
          strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      href: '/library',
      label: t.library,
      icon: (a: boolean) => (
        <svg width="22" height="22" fill="none" stroke={a ? '#D4AF37' : '#9ca3af'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3v18M9 3h10a2 2 0 012 2v5" strokeLinecap="round"/>
          <circle cx="16" cy="17" r="3" stroke={a ? '#D4AF37' : '#9ca3af'}/>
          <path d="M19 14V9l3-1" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      href: '/playlist',
      label: t.playlist,
      icon: (a: boolean) => (
        <svg width="22" height="22" fill="none" stroke={a ? '#D4AF37' : '#9ca3af'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round"/>
          <circle cx="18" cy="17" r="3"/>
          <path d="M21 14V9l-3-1" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      href: '/settings',
      label: t.settings,
      icon: (a: boolean) => (
        <svg width="22" height="22" fill="none" stroke={a ? '#D4AF37' : '#9ca3af'} strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  const navHeight = currentSong ? 132 : 72;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <main
        className="flex-1 overflow-y-auto slide-up"
        style={{ paddingBottom: `calc(${navHeight}px + env(safe-area-inset-bottom, 0px))` }}
      >
        {children}
      </main>

      <PWAInstallBanner />
      {currentSong && <MiniPlayer />}

      {/* ── Frosted-glass bottom nav ───────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'saturate(180%) blur(24px)',
          WebkitBackdropFilter: 'saturate(180%) blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 relative"
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{ width: 20, height: 2.5, background: '#D4AF37' }}
                  />
                )}
                {item.icon(active)}
                <span
                  className="text-xs font-medium leading-none"
                  style={{ color: active ? '#D4AF37' : '#9ca3af' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
