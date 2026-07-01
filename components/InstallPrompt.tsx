'use client';

/**
 * InstallPrompt — shown automatically once after a new user signs in / is approved.
 *
 * Flow:
 *  1. Auth page sets  sessionStorage['show_install_prompt'] = '1'  on success.
 *  2. This component reads that flag when it mounts on /home.
 *  3. Android/Chrome: calls triggerInstall() which waits up to 6s for
 *     beforeinstallprompt, then fires the native dialog automatically.
 *  4. iOS Safari: can't auto-install — shows step-by-step guide instead.
 *  5. Either way: flag is cleared immediately so this only runs ONCE per device.
 *
 * The modal is suppressed permanently once the user installs or taps "Don't install".
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePWA } from '@/context/PWAContext';

type Phase =
  | 'idle'          // nothing to show
  | 'waiting'       // waiting for beforeinstallprompt (Android)
  | 'card'          // show full-screen install card (prompt unavailable / was dismissed)
  | 'ios'           // iOS step-by-step guide
  | 'success';      // installed! — brief confirmation then auto-dismiss

export default function InstallPrompt() {
  const { isInstalled, isIOS, triggerInstall } = usePWA();
  const [phase, setPhase]       = useState<Phase>('idle');
  const [installing, setInstalling] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    // Already a PWA
    if (isInstalled) return;
    // Already permanently dismissed or installed on this device
    if (localStorage.getItem('pwa_installed') === '1') return;
    if (localStorage.getItem('pwa_dismissed') === '1') return;
    // Only trigger right after login/register
    if (sessionStorage.getItem('show_install_prompt') !== '1') return;
    // Guard against StrictMode double-run
    if (hasRun.current) return;
    hasRun.current = true;

    // Consume the flag immediately so refreshing won't retrigger
    sessionStorage.removeItem('show_install_prompt');

    if (isIOS) {
      // iOS: can't auto-install, show manual guide
      setTimeout(() => setPhase('ios'), 700);
      return;
    }

    // Android/Chrome: attempt to trigger the native prompt automatically.
    // We wait up to 6 s for beforeinstallprompt (solves the race condition).
    setPhase('waiting');
    (async () => {
      const outcome = await triggerInstall(6000);
      if (outcome === 'accepted') {
        setPhase('success');
        setTimeout(() => setPhase('idle'), 2800);
      } else if (outcome === 'unavailable') {
        // Browser doesn't support install (desktop Chrome, Firefox, etc.) — silently skip
        setPhase('idle');
      } else {
        // 'dismissed' — user saw the native dialog and tapped Cancel
        // Show our fallback card so they can retry
        setPhase('card');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also update if the app gets installed externally (e.g. browser bar button)
  useEffect(() => {
    if (isInstalled) setPhase('idle');
  }, [isInstalled]);

  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);
    const outcome = await triggerInstall(4000);
    setInstalling(false);
    if (outcome === 'accepted') {
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2800);
    } else {
      setPhase('idle');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', '1');
    setPhase('idle');
  };

  /* ── Success confirmation ─────────────────────────────────────────────────── */
  if (phase === 'success') {
    return (
      <Overlay>
        <div className="flex flex-col items-center py-8 gap-4">
          <div
            className="w-18 h-18 rounded-full flex items-center justify-center"
            style={{ width: 72, height: 72, background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E' }}
          >
            <svg width="34" height="34" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-white font-extrabold text-xl">App Installed! 🎉</p>
          <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Apostolic Songs is now on your home screen
          </p>
        </div>
      </Overlay>
    );
  }

  /* ── Waiting for prompt — subtle spinner overlay ─────────────────────────── */
  if (phase === 'waiting') {
    return (
      <Overlay transparent>
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: 'rgba(212,175,55,0.3)',
              borderTopColor: '#D4AF37',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Preparing install…
          </p>
        </div>
      </Overlay>
    );
  }

  /* ── Fallback install card (user dismissed native dialog) ─────────────────── */
  if (phase === 'card') {
    return (
      <Overlay>
        <Handle />

        {/* App identity */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 0 20px rgba(212,175,55,0.2)' }}
          >
            <Image src="/icons/icon-192.png" alt="Apostolic Songs" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-extrabold text-lg leading-tight">Apostolic Songs</p>
            <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>Afaan Oromoo · Free</p>
            <Stars />
          </div>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { icon: '🎵', label: 'Afaan Oromo' },
            { icon: '📶', label: 'Works Offline' },
            { icon: '⚡', label: 'Fast & Free' },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-xl leading-none">{f.icon}</span>
              <span className="text-xs text-center font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleInstall}
          disabled={installing}
          className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2.5 transition-all active:scale-95"
          style={{
            background: installing
              ? '#b8960c'
              : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 100%)',
            color: '#0d1b2a',
            boxShadow: '0 4px 24px rgba(212,175,55,0.4)',
          }}
        >
          {installing ? (
            <>
              <span
                className="w-5 h-5 rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: 'rgba(13,27,42,0.3)',
                  borderTopColor: '#0d1b2a',
                  animation: 'spin 0.9s linear infinite',
                  display: 'inline-block',
                }}
              />
              Installing…
            </>
          ) : (
            <>
              <svg width="20" height="20" fill="none" stroke="#0d1b2a" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Install App — Free
            </>
          )}
        </button>

        <button
          onClick={handleDismiss}
          className="w-full mt-3 py-2.5 text-sm text-center rounded-xl transition-all active:opacity-60"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Don't install
        </button>
      </Overlay>
    );
  }

  /* ── iOS manual guide ─────────────────────────────────────────────────────── */
  if (phase === 'ios') {
    return (
      <Overlay>
        <Handle />

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(212,175,55,0.5)' }}
          >
            <Image src="/icons/icon-192.png" alt="Apostolic Songs" width={56} height={56} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">Install Apostolic Songs</p>
            <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>Add to Home Screen — Free</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <IOSStep num={1}>
            Tap the{' '}
            <strong className="text-white">Share</strong>{' '}
            <svg className="inline" width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>{' '}
            button at the bottom of Safari
          </IOSStep>
          <IOSStep num={2}>
            Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>
          </IOSStep>
          <IOSStep num={3}>
            Tap <strong className="text-white">"Add"</strong> — done! 🎉
          </IOSStep>
        </div>

        <div className="flex flex-col items-center mb-5 gap-1">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tap the Share button below ↓</p>
          <svg width="18" height="18" fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-center transition-all active:scale-95"
          style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          Got it — I'll install it now
        </button>
        <button
          onClick={handleDismiss}
          className="w-full mt-2 py-2 text-sm text-center"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Not now
        </button>
      </Overlay>
    );
  }

  return null;
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function Overlay({ children, transparent }: { children: React.ReactNode; transparent?: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-end"
      style={{ background: transparent ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl fade-in"
        style={{
          background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 55%, #0f3460 100%)',
          border: '1px solid rgba(212,175,55,0.2)',
          maxWidth: 480,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Handle() {
  return <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.18)' }} />;
}

function Stars() {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#D4AF37">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Free</span>
    </div>
  );
}

function IOSStep({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
        style={{ background: '#D4AF37', color: '#0d1b2a', marginTop: 1 }}
      >
        {num}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{children}</p>
    </div>
  );
}
