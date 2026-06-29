'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePWA } from '@/context/PWAContext';

/**
 * Shown on the home page right after sign-in.
 * - Android/Chrome: auto-fires the native install prompt immediately.
 * - iOS Safari: shows a friendly "Add to Home Screen" instruction sheet.
 * - Already installed / already seen: nothing shown.
 */
export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWA();
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const shouldShow = sessionStorage.getItem('show_install_prompt') === '1';
    if (!shouldShow) return;

    // Clear the flag so it only fires once per login
    sessionStorage.removeItem('show_install_prompt');

    if (canInstall) {
      // Android/Chrome: trigger native prompt immediately
      triggerInstall().catch(() => {});
    } else if (isIOS) {
      // iOS: show manual instructions after a short delay
      setTimeout(() => setShowIOSGuide(true), 800);
    } else {
      // Fallback: show install banner
      setTimeout(() => setShow(true), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // run once on mount

  const handleInstall = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
    setShow(false);
  };

  // Android fallback banner (if prompt wasn't captured at sign-in time)
  if (show && canInstall && !isInstalled) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-full max-w-sm mx-3 mb-6 rounded-2xl p-5 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(212,175,55,0.4)' }}>
              <Image src="/icons/icon.png" alt="Apostolic Songs" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-white text-base">Apostolic Songs</p>
              <p className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>Afaan Oromo · Works offline</p>
            </div>
            <button
              onClick={() => setShow(false)}
              className="ml-auto w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <p className="text-sm text-white/70 mb-4">
            Install the app for faster access and offline listening — no app store needed.
          </p>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: installing ? '#e0c070' : '#D4AF37', color: '#1a1a2e' }}
          >
            <svg width="16" height="16" fill="none" stroke="#1a1a2e" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {installing ? 'Installing...' : 'Install App — Free'}
          </button>
          <button
            onClick={() => setShow(false)}
            className="w-full mt-2 py-2 text-xs text-center"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  // iOS instruction sheet
  if (showIOSGuide && !isInstalled) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-full max-w-sm mx-3 mb-6 rounded-2xl p-5 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(212,175,55,0.4)' }}>
              <Image src="/icons/icon.png" alt="Apostolic Songs" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Install Apostolic Songs</p>
              <p className="text-xs" style={{ color: '#D4AF37' }}>Add to your Home Screen</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <Step num={1} color="#D4AF37">
              Tap the{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-white">
                Share
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>{' '}
              button at the bottom of Safari
            </Step>
            <Step num={2} color="#D4AF37">
              Scroll down and tap{' '}
              <span className="font-semibold text-white">"Add to Home Screen"</span>
            </Step>
            <Step num={3} color="#D4AF37">
              Tap <span className="font-semibold text-white">"Add"</span> — done! 🎉
            </Step>
          </div>

          <button
            onClick={() => setShowIOSGuide(false)}
            className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-center"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function Step({ num, color, children }: { num: number; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
        style={{ background: color, color: '#1a1a2e' }}
      >
        {num}
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{children}</p>
    </div>
  );
}
