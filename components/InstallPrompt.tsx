'use client';

/**
 * InstallPrompt — automatic install on all supported platforms
 *
 * Flow:
 *  1. Splash sets sessionStorage['show_install_prompt'] = '1'
 *  2. On home page mount, card appears after 400ms
 *  3. Android / Chrome / Edge / Samsung:
 *       - Native beforeinstallprompt fires automatically (up to 10s wait)
 *       - If accepted → success screen → idle
 *       - If dismissed → card stays so user can tap the button again
 *  4. iOS Safari: step-by-step Share → Add to Home Screen guide
 *  5. Desktop (Windows/macOS/Linux) Chrome/Edge: same beforeinstallprompt path
 *  6. "Not now" dismisses permanently (localStorage)
 *
 * Persistent compact banner shown on repeat visits while canInstall=true.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePWA } from '@/context/PWAContext';

type Phase = 'idle' | 'card' | 'ios' | 'installing' | 'success';

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWA();

  const [phase, setPhase]               = useState<Phase>('idle');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerInstalling, setBannerInstalling] = useState(false);
  const didAutoRun = useRef(false);

  // ── First-visit: show card then auto-trigger native install prompt ────────
  useEffect(() => {
    if (isInstalled) return;
    if (localStorage.getItem('pwa_installed') === '1') return;
    if (localStorage.getItem('pwa_dismissed') === '1') return;
    if (sessionStorage.getItem('show_install_prompt') !== '1') return;
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    sessionStorage.removeItem('show_install_prompt');

    if (isIOS) {
      // iOS can't auto-install — show the guide
      setTimeout(() => setPhase('ios'), 400);
      return;
    }

    // Show installing state immediately, then fire native prompt
    setTimeout(async () => {
      setPhase('installing');
      const outcome = await triggerInstall(10000);
      if (outcome === 'accepted') {
        setPhase('success');
        setTimeout(() => setPhase('idle'), 2500);
      } else if (outcome === 'dismissed') {
        // User cancelled the native dialog — show retry card
        setPhase('card');
      } else {
        // Browser doesn't support beforeinstallprompt — dismiss silently
        setPhase('idle');
      }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIOS]);

  // ── Persistent banner on repeat visits ───────────────────────────────────
  useEffect(() => {
    if (isInstalled) { setBannerVisible(false); return; }
    if (localStorage.getItem('pwa_installed') === '1') { setBannerVisible(false); return; }
    if (localStorage.getItem('pwa_dismissed') === '1') { setBannerVisible(false); return; }
    if (phase !== 'idle') { setBannerVisible(false); return; }
    if (canInstall) setBannerVisible(true);
  }, [canInstall, isInstalled, phase]);

  useEffect(() => {
    if (isInstalled) { setPhase('idle'); setBannerVisible(false); }
  }, [isInstalled]);

  // ── Manual install from card (retry after dismiss) ────────────────────────
  const handleCardInstall = async () => {
    setPhase('installing');
    const outcome = await triggerInstall(10000);
    if (outcome === 'accepted') {
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2500);
    } else {
      setPhase('card');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', '1');
    setPhase('idle');
    setBannerVisible(false);
  };

  // ── Banner handlers ───────────────────────────────────────────────────────
  const handleBannerInstall = async () => {
    if (bannerInstalling) return;
    setBannerInstalling(true);
    const outcome = await triggerInstall(10000);
    setBannerInstalling(false);
    if (outcome === 'accepted') {
      setBannerVisible(false);
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2500);
    }
  };

  const handleBannerDismiss = () => {
    setBannerVisible(false);
    localStorage.setItem('pwa_dismissed', '1');
  };

  return (
    <>
      {/* ══ PERSISTENT BANNER ═══════════════════════════════════════════════ */}
      {bannerVisible && phase === 'idle' && (
        <div className="fade-in" style={{
          margin: '12px 16px 0', borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2744 60%, #0f3460 100%)',
          border: '1px solid rgba(212,175,55,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #D4AF37, #F0D060, #D4AF37)' }} />
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 overflow-hidden"
                style={{ width: 44, height: 44, borderRadius: 12,
                  border: '1.5px solid rgba(212,175,55,0.5)', boxShadow: '0 0 12px rgba(212,175,55,0.2)' }}>
                <Image src="/icons/icon-192.png" alt="Faarfannaa Afaan Oromo" width={44} height={44} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-white text-sm leading-tight">Faarfannaa Afaan Oromo</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-semibold" style={{ color: '#D4AF37' }}>Free</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Works Offline</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Afaan Oromo</span>
                </div>
              </div>
              <button onClick={handleBannerDismiss} aria-label="Dismiss"
                className="flex-shrink-0 flex items-center justify-center active:opacity-60"
                style={{ width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg width="10" height="10" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <button onClick={handleBannerInstall} disabled={bannerInstalling}
              className="w-full flex items-center justify-center gap-2 font-extrabold transition-all active:scale-95"
              style={{ height: 46, borderRadius: 14, fontSize: 15, color: '#0d1b2a',
                background: bannerInstalling ? 'rgba(212,175,55,0.6)' : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
                boxShadow: bannerInstalling ? 'none' : '0 3px 16px rgba(212,175,55,0.45)' }}>
              {bannerInstalling ? <><Spin dark />Installing…</> : <><DlIcon />Install App — Free</>}
            </button>
          </div>
        </div>
      )}

      {/* ══ INSTALL CARD / INSTALLING ════════════════════════════════════════ */}
      {(phase === 'card' || phase === 'installing') && (
        <FullOverlay>
          <div className="flex items-center gap-4 mb-6">
            <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(212,175,55,0.6)', boxShadow: '0 0 28px rgba(212,175,55,0.3)' }}>
              <Image src="/icons/icon-192.png" alt="Faarfannaa Afaan Oromo" width={72} height={72} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-extrabold text-xl leading-tight">Faarfannaa Afaan Oromo</p>
              <p className="font-semibold text-sm mt-0.5" style={{ color: '#D4AF37' }}>Afaan Oromo · Free</p>
              <Stars />
            </div>
          </div>

          {phase === 'installing' ? (
            /* Native dialog is open — simple, accurate instruction */
            <div className="flex flex-col items-center gap-0 py-2">

              {/* Pulsing install icon */}
              <div className="flex items-center justify-center mb-4"
                style={{ width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(212,175,55,0.15)', border: '2px solid rgba(212,175,55,0.4)',
                  animation: 'pulse 1.5s ease-in-out infinite' }}>
                <DlIcon size={28} color="#D4AF37" />
              </div>

              {/* Main instruction */}
              <div className="w-full rounded-2xl px-4 py-4 mb-3 text-center"
                style={{ background: 'rgba(212,175,55,0.12)', border: '1.5px solid rgba(212,175,55,0.4)' }}>
                <p className="text-white font-extrabold text-lg leading-tight mb-1">
                  A dialog just appeared
                </p>
                <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                  Tap <strong style={{ color: 'white' }}>"Install"</strong> or <strong style={{ color: 'white' }}>"Add to Home Screen"</strong> to continue
                </p>
              </div>

              {/* Device-specific hints */}
              <div className="w-full space-y-2 mb-3">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-lg flex-shrink-0">📱</span>
                  <div>
                    <p className="text-xs font-bold text-white">Android / Chrome</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Tap the popup that appeared at the bottom of your screen</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-lg flex-shrink-0">💻</span>
                  <div>
                    <p className="text-xs font-bold text-white">Desktop (Chrome / Edge)</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Click "Install" in the dialog that appeared</p>
                  </div>
                </div>
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.08); opacity: 0.8; }
                }
              `}</style>
            </div>
          ) : (
            /* Retry card after native dialog was dismissed */
            <>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { icon: '🎵', label: 'Afaan Oromo' },
                  { icon: '📶', label: 'Works Offline' },
                  { icon: '⚡', label: 'Fast & Free' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-xl leading-none">{f.icon}</span>
                    <span className="text-xs text-center font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCardInstall}
                className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2.5 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F0D060 100%)', color: '#0d1b2a', boxShadow: '0 4px 24px rgba(212,175,55,0.45)' }}>
                <DlIcon size={20} />Install App — Free
              </button>
            </>
          )}

          <button onClick={handleDismiss}
            className="w-full mt-4 py-3 text-sm text-center rounded-xl transition-all active:opacity-60"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            Not now — open app
          </button>
        </FullOverlay>
      )}

      {/* ══ iOS GUIDE ════════════════════════════════════════════════════════ */}
      {phase === 'ios' && (
        <FullOverlay>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(212,175,55,0.5)' }}>
              <Image src="/icons/icon-192.png" alt="Faarfannaa Afaan Oromo" width={60} height={60} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-extrabold text-white text-lg leading-tight">Install Faarfannaa Afaan Oromo</p>
              <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>Add to Home Screen — Free</p>
            </div>
          </div>
          <div className="space-y-4 mb-6">
            <IOSStep num={1}>
              Tap the <strong className="text-white">Share</strong>{' '}
              <svg className="inline" width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>{' '}
              button at the bottom of Safari
            </IOSStep>
            <IOSStep num={2}>Scroll and tap <strong className="text-white">"Add to Home Screen"</strong></IOSStep>
            <IOSStep num={3}>Tap <strong className="text-white">"Add"</strong> — done! 🎉</IOSStep>
          </div>
          <div className="flex flex-col items-center mb-5 gap-1">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tap the Share button below ↓</p>
            <svg width="18" height="18" fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button onClick={handleDismiss}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-center transition-all active:scale-95"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
            Got it — I'll install it now
          </button>
          <button onClick={handleDismiss} className="w-full mt-2 py-2 text-sm text-center"
            style={{ color: 'rgba(255,255,255,0.25)' }}>Not now</button>
        </FullOverlay>
      )}

      {/* ══ SUCCESS ══════════════════════════════════════════════════════════ */}
      {phase === 'success' && (
        <FullOverlay>
          <div className="flex flex-col items-center py-6 gap-4">
            <div style={{ width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="38" height="38" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-white font-extrabold text-2xl">App Installed! 🎉</p>
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Faarfannaa Afaan Oromo is now on your home screen
            </p>
          </div>
        </FullOverlay>
      )}
    </>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function FullOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl fade-in"
        style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 55%, #0f3460 100%)',
          border: '1px solid rgba(212,175,55,0.25)', maxWidth: 480 }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.18)' }} />
        {children}
      </div>
    </div>
  );
}

function Stars() {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1,2,3,4,5].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#D4AF37">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Free</span>
    </div>
  );
}

function Spin({ dark }: { dark?: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
      border: `2px solid ${dark ? 'rgba(13,27,42,0.3)' : 'rgba(212,175,55,0.3)'}`,
      borderTopColor: dark ? '#0d1b2a' : '#D4AF37',
      animation: 'spin 0.9s linear infinite' }} />
  );
}

function DlIcon({ size = 18, color = '#0d1b2a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IOSStep({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
        style={{ background: '#D4AF37', color: '#0d1b2a', marginTop: 1 }}>
        {num}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{children}</p>
    </div>
  );
}
