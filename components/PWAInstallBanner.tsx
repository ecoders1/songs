'use client';

import { useEffect, useRef, useState } from 'react';
import { usePWA } from '@/context/PWAContext';

export default function PWAInstallBanner() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWA();
  const [dismissed, setDismissed]   = useState(false);
  const [installing, setInstalling] = useState(false);
  const [visible, setVisible]       = useState(false);
  const didAutoRun = useRef(false);

  // Show banner after a short delay once canInstall is ready
  useEffect(() => {
    if (isInstalled) return;
    if (localStorage.getItem('pwa_installed')  === '1') return;
    if (localStorage.getItem('pwa_dismissed')  === '1') return;
    if (sessionStorage.getItem('pwa_banner_dismissed') === '1') return;
    if (!canInstall && !isIOS) return;

    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [canInstall, isInstalled, isIOS]);

  // On pages reached via direct link (no splash), auto-trigger the native
  // install prompt so the user doesn't have to tap twice.
  useEffect(() => {
    if (!canInstall) return;
    if (isInstalled) return;
    if (localStorage.getItem('pwa_installed') === '1') return;
    if (localStorage.getItem('pwa_dismissed') === '1') return;
    // Only auto-trigger if the splash page didn't already handle it
    if (sessionStorage.getItem('visited') === '1') return;
    if (didAutoRun.current) return;
    didAutoRun.current = true;

    // Small delay so the page paints first
    const t = setTimeout(async () => {
      setInstalling(true);
      const outcome = await triggerInstall(10000);
      setInstalling(false);
      if (outcome === 'accepted') {
        setVisible(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInstall]);

  useEffect(() => {
    if (isInstalled) setVisible(false);
  }, [isInstalled]);

  if (!visible || dismissed) return null;
  if (isInstalled) return null;

  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);
    const outcome = await triggerInstall(10000);
    setInstalling(false);
    if (outcome === 'accepted') setVisible(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
  };

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-50 rounded-2xl p-4 shadow-2xl fade-in"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', border: '1px solid rgba(212,175,55,0.3)' }}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: '#D4AF37' }}
        >
          <img src="/icons/icon-192.png" alt="Faarfannaa" className="w-full h-full object-cover" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm">Install Faarfannaa</p>
          <p className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>
            Afaan Oromo · Works offline · Free
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          aria-label="Dismiss"
        >
          <svg width="12" height="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        disabled={installing}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ background: installing ? '#e0c070' : '#D4AF37', color: '#1a1a2e', opacity: installing ? 0.8 : 1 }}
      >
        {installing ? (
          <>
            <span
              style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(26,26,46,0.3)',
                borderTopColor: '#1a1a2e',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            Installing…
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" stroke="#1a1a2e" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Install App — Free
          </>
        )}
      </button>
    </div>
  );
}
