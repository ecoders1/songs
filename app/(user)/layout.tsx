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

  const navItems = [
    {
      href: '/home',
      label: t.home,
      icon: (active: boolean) => (
        <svg width="22" height="22" fill={active ? '#D4AF37' : 'none'} stroke={active ? '#D4AF37' : '#888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: '/library',
      label: t.library,
      icon: (active: boolean) => (
        <svg width="22" height="22" fill="none" stroke={active ? '#D4AF37' : '#888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3v18M9 3h10a2 2 0 012 2v5" strokeLinecap="round" />
          <circle cx="16" cy="17" r="3" stroke={active ? '#D4AF37' : '#888'} />
          <path d="M19 14V9l3-1" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: '/playlist',
      label: t.playlist,
      icon: (active: boolean) => (
        <svg width="22" height="22" fill="none" stroke={active ? '#D4AF37' : '#888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round" />
          <circle cx="18" cy="17" r="3" />
          <path d="M21 14V9l-3-1" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: '/settings',
      label: t.settings,
      icon: (active: boolean) => (
        <svg width="22" height="22" fill="none" stroke={active ? '#D4AF37' : '#888'} strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: currentSong ? '132px' : '72px' }}
      >
        {children}
      </main>

      <PWAInstallBanner />
      {currentSong && <MiniPlayer />}

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t z-40"
        style={{ borderColor: '#e8e8f0' }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 flex-1 py-2"
              >
                {item.icon(active)}
                <span className="text-xs font-medium" style={{ color: active ? '#D4AF37' : '#888' }}>
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
