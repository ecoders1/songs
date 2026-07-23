'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import MiniPlayer from '@/components/MiniPlayer';
import PWAInstallBanner from '@/components/PWAInstallBanner';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const NAV = [
    {
      href: '/home',
      label: t.home,
      activeIcon: (
        <svg width="22" height="22" fill="#D4AF37" viewBox="0 0 24 24">
          <path d="M10.707 2.293a1 1 0 011.586 0l7 7A1 1 0 0119 11h-1v9a1 1 0 01-1 1h-4v-6H11v6H7a1 1 0 01-1-1v-9H5a1 1 0 01-.707-1.707l7-7z"/>
        </svg>
      ),
      inactiveIcon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      href: '/library',
      label: t.library,
      activeIcon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="3" width="5" height="18" rx="1" fill="#D4AF37"/>
          <rect x="10" y="3" width="5" height="18" rx="1" fill="#D4AF37" opacity="0.6"/>
          <rect x="17" y="3" width="4" height="18" rx="1" fill="#D4AF37" opacity="0.35"/>
        </svg>
      ),
      inactiveIcon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <rect x="3" y="3" width="5" height="18" rx="1"/>
          <rect x="10" y="3" width="5" height="18" rx="1"/>
          <rect x="17" y="3" width="4" height="18" rx="1"/>
        </svg>
      ),
    },
    {
      href: '/playlist',
      label: t.playlist,
      activeIcon: (
        <svg width="22" height="22" fill="none" stroke="#D4AF37" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round"/>
          <circle cx="18" cy="17" r="3" fill="#D4AF37" stroke="none"/>
          <path d="M21 14V9l-3-1" strokeLinecap="round"/>
        </svg>
      ),
      inactiveIcon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h12M3 18h8" strokeLinecap="round"/>
          <circle cx="18" cy="17" r="3"/>
          <path d="M21 14V9l-3-1" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      href: '/settings',
      label: t.settings,
      activeIcon: (
        <svg width="22" height="22" fill="none" stroke="#D4AF37" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" fill="#D4AF37" stroke="none"/>
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
        </svg>
      ),
      inactiveIcon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: `calc(${navHeight}px + env(safe-area-inset-bottom, 0px))` }}
      >
        {children}
      </main>

      <PWAInstallBanner />
      {currentSong && <MiniPlayer />}

      {/* ── Modern bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: isDark
            ? 'rgba(13,13,24,0.92)'
            : 'rgba(255,255,255,0.92)',
          backdropFilter: 'saturate(200%) blur(28px)',
          WebkitBackdropFilter: 'saturate(200%) blur(28px)',
          borderTop: isDark
            ? '1px solid rgba(255,255,255,0.07)'
            : '1px solid rgba(0,0,0,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto" style={{ height: 64 }}>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 relative transition-opacity active:opacity-60"
              >
                {/* Active pill indicator */}
                {active && (
                  <span
                    className="absolute top-0 inset-x-0 flex justify-center"
                  >
                    <span
                      className="block rounded-full"
                      style={{ width: 32, height: 3, background: 'linear-gradient(90deg, #B8960C, #D4AF37, #F0D060)', marginTop: -1 }}
                    />
                  </span>
                )}

                {/* Active pill background */}
                {active && (
                  <span
                    className="absolute rounded-2xl"
                    style={{
                      inset: '8px 12px',
                      background: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.08)',
                    }}
                  />
                )}

                <span className="relative z-10">
                  {active ? item.activeIcon : item.inactiveIcon}
                </span>

                <span
                  className="text-xs font-semibold leading-none relative z-10"
                  style={{ color: active ? '#D4AF37' : isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af' }}
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
