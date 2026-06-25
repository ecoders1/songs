'use client';

import { useEffect, useState } from 'react';

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Check if user dismissed before
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-show banner after 2 seconds
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
  };

  if (installed || !show) return null;

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
          <svg width="28" height="28" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="256" cy="256" r="200" fill="none" stroke="#1a1a2e" strokeWidth="20"/>
            <ellipse cx="256" cy="256" rx="200" ry="80" fill="none" stroke="#1a1a2e" strokeWidth="14" opacity="0.7"/>
            <line x1="56" y1="256" x2="456" y2="256" stroke="#1a1a2e" strokeWidth="14" opacity="0.7"/>
            <rect x="243" y="120" width="26" height="160" rx="8" fill="#1a1a2e"/>
            <rect x="183" y="178" width="146" height="26" rx="8" fill="#1a1a2e"/>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm">Install Faarfannaa</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Apostolic Songs Afaan Oromoo
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>
            Add to home screen · Works offline
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          aria-label="Dismiss"
        >
          <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ background: '#D4AF37', color: '#1a1a2e' }}
      >
        <svg width="16" height="16" fill="none" stroke="#1a1a2e" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Install App — Free
      </button>
    </div>
  );
}
