'use client';

/**
 * InstallPrompt — two-layer install UX
 *
 * Layer 1 — Sticky home-page banner (always visible until installed/dismissed)
 *   • Shown whenever `canInstall` is true (browser has a pending beforeinstallprompt)
 *     AND the user hasn't installed or permanently dismissed.
 *   • Tapping "Install App — Free" fires the native dialog immediately.
 *   • "✕" hides it for the session (localStorage hides it permanently).
 *
 * Layer 2 — Auto-trigger on first sign-in (Android/Chrome only)
 *   • Auth page sets sessionStorage['show_install_prompt']='1'.
 *   • On mount, waits up to 6 s for beforeinstallprompt then auto-fires.
 *   • If user taps Cancel → shows the full-screen fallback card.
 *   • iOS → shows step-by-step Share→Add to Home Screen guide.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePWA } from '@/context/PWAContext';

type ModalPhase = 'idle' | 'waiting' | 'card' | 'ios' | 'success';

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWA();

  // ── Banner state ─────────────────────────────────────────────────────────
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerInstalling, setBannerInstalling] = useState(false);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState<ModalPhase>('idle');
  const [modalInstalling, setModalInstalling] = useState(false);
  const hasAutoRun = useRef(false);

  // ── Show banner whenever the prompt is available ─────────────────────────
  useEffect(() => {
    if (isInstalled) { setBannerVisible(false); return; }
    if (localStorage.getItem('pwa_installed')  === '1') { setBannerVisible(false); return; }
    if (localStorage.getItem('pwa_dismissed')  === '1') { setBannerVisible(false); return; }
    if (canInstall) setBannerVisible(true);
  }, [canInstall, isInstalled]);

  // ── Auto-trigger modal on first sign-in ──────────────────────────────────
  useEffect(() => {
    if (isInstalled) return;
    if (localStorage.getItem('pwa_installed') === '1') return;
    if (localStorage.getItem('pwa_dismissed') === '1') return;
    if (sessionStorage.getItem('show_install_prompt') !== '1') return;
    if (hasAutoRun.current) return;
    hasAutoRun.current = true;
    sessionStorage.removeItem('show_install_prompt');

    if (isIOS) {
      setTimeout(() => setPhase('ios'), 800);
      return;
    }

    setPhase('waiting');
    (async () => {
      const outcome = await triggerInstall(6000);
      if (outcome === 'accepted') {
        setPhase('success');
        setTimeout(() => setPhase('idle'), 2800);
      } else if (outcome === 'unavailable') {
        setPhase('idle');
      } else {
        // dismissed native dialog — show our card
        setPhase('card');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (isInstalled) setPhase('idle'); }, [isInstalled]);

  // ── Banner handlers ───────────────────────────────────────────────────────
  const handleBannerInstall = async () => {
    if (bannerInstalling) return;
    setBannerInstalling(true);
    const outcome = await triggerInstall(4000);
    setBannerInstalling(false);
    if (outcome === 'accepted') {
      setBannerVisible(false);
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2800);
    }
    // If dismissed or unavailable — keep banner visible so they can try again
  };

  const handleBannerDismiss = () => {
    setBannerVisible(false);
    localStorage.setItem('pwa_dismissed', '1');
  };

  // ── Modal handlers ────────────────────────────────────────────────────────
  const handleModalInstall = async () => {
    if (modalInstalling) return;
    setModalInstalling(true);
    const outcome = await triggerInstall(4000);
    setModalInstalling(false);
    if (outcome === 'accepted') {
      setPhase('success');
      setTimeout(() => setPhase('idle'), 2800);
    } else {
      setPhase('idle');
    }
  };

  const handleModalDismiss = () => {
    localStorage.setItem('pwa_dismissed', '1');
    setPhase('idle');
    setBannerVisible(false);
  };

  return (
    <>
      {/* ══ LAYER 1 — persistent sticky install banner ══════════════════════ */}
      {bannerVisible && phase === 'idle' && (
        <div
          className="fade-in"
          style={{
            margin: '12px 16px 0',
            borderRadius: 18,
            background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2744 60%, #0f3460 100%)',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          {/* Gold accent top-bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #D4AF37, #F0D060, #D4AF37)' }} />

          <div className="px-4 pt-3 pb-3">
            {/* App identity row */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex-shrink-0 overflow-hidden"
                style={{ width: 44, height: 44, borderRadius: 12,
                  border: '1.5px solid rgba(212,175,55,0.5)',
                  boxShadow: '0 0 12px rgba(212,175,55,0.2)' }}
              >
                <Image src="/icons/icon.svg" alt="Apostolic Songs" width={44} height={44} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-white text-sm leading-tight">Apostolic Songs</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: '#D4AF37' }}>Free</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Works Offline</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Afaan Oromo</span>
                </div>
              </div>

              {/* Dismiss ✕ */}
              <button
                onClick={handleBannerDismiss}
                className="flex-shrink-0 flex items-center justify-center active:opacity-60"
                style={{ width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                aria-label="Dismiss install banner"
              >
                <svg width="10" height="10" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Install button */}
            <button
              onClick={handleBannerInstall}
              disabled={bannerInstalling}
              className="w-full flex items-center justify-center gap-2 font-extrabold transition-all active:scale-95"
              style={{
                height: 46,
                borderRadius: 14,
                background: bannerInstalling
                  ? 'rgba(212,175,55,0.6)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
                color: '#0d1b2a',
                fontSize: 15,
                boxShadow: bannerInstalling ? 'none' : '0 3px 16px rgba(212,175,55,0.45)',
              }}
            >
              {bannerInstalling ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 18, height: 18,
                      borderRadius: '50%',
                      border: '2px solid rgba(13,27,42,0.25)',
                      borderTopColor: '#0d1b2a',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Installing…
                </>
              ) : (
                <>
                  <svg width="18" height="18" fill="none" stroke="#0d1b2a" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Install App — Free
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══ LAYER 2 — modal overlays ════════════════════════════════════════ */}

      {/* Success */}
      {phase === 'success' && (
        <Modal>
          <div className="flex flex-col items-center py-8 gap-4">
            <div style={{ width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="34" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-white font-extrabold text-xl">App Installed! 🎉</p>
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Apostolic Songs is now on your home screen
            </p>
          </div>
        </Modal>
      )}

      {/* Waiting spinner */}
      {phase === 'waiting' && (
        <Modal transparent>
          <div className="flex flex-col items-center gap-3 py-6">
            <div style={{ width: 40, height: 40, borderRadius: '50%',
              border: '2px solid rgba(212,175,55,0.3)',
              borderTopColor: '#D4AF37',
              animation: 'spin 0.9s linear infinite' }} />
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Preparing install…
            </p>
          </div>
        </Modal>
      )}

      {/* Fallback card — user tapped Cancel on native dialog */}
      {phase === 'card' && (
        <Modal>
          <Handle />
          <div className="flex items-center gap-4 mb-5">
            <div style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 0 20px rgba(212,175,55,0.2)' }}>
              <Image src="/icons/icon.svg" alt="Apostolic Songs" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-tight">Apostolic Songs</p>
              <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>Afaan Oromoo · Free</p>
              <Stars />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {[{ icon: '🎵', label: 'Afaan Oromo' }, { icon: '📶', label: 'Works Offline' }, { icon: '⚡', label: 'Fast & Free' }]
              .map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-xl leading-none">{f.icon}</span>
                  <span className="text-xs text-center font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.label}</span>
                </div>
              ))}
          </div>

          <button onClick={handleModalInstall} disabled={modalInstalling}
            className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2.5 transition-all active:scale-95"
            style={{
              background: modalInstalling ? '#b8960c' : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 100%)',
              color: '#0d1b2a',
              boxShadow: '0 4px 24px rgba(212,175,55,0.4)',
            }}>
            {modalInstalling ? (
              <>
                <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid rgba(13,27,42,0.3)', borderTopColor: '#0d1b2a',
                  animation: 'spin 0.9s linear infinite' }} />
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

          <button onClick={handleModalDismiss}
            className="w-full mt-3 py-2.5 text-sm text-center rounded-xl transition-all active:opacity-60"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            Don't install
          </button>
        </Modal>
      )}

      {/* iOS guide */}
      {phase === 'ios' && (
        <Modal>
          <Handle />
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
              border: '2px solid rgba(212,175,55,0.5)' }}>
              <Image src="/icons/icon.svg" alt="Apostolic Songs" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-extrabold text-white text-lg leading-tight">Install Apostolic Songs</p>
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

          <button onClick={handleModalDismiss}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-center transition-all active:scale-95"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
            Got it — I'll install it now
          </button>
          <button onClick={handleModalDismiss}
            className="w-full mt-2 py-2 text-sm text-center"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            Not now
          </button>
        </Modal>
      )}
    </>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function Modal({ children, transparent }: { children: React.ReactNode; transparent?: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end"
      style={{ background: transparent ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl fade-in"
        style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 55%, #0f3460 100%)',
          border: '1px solid rgba(212,175,55,0.2)', maxWidth: 480 }}>
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
      {[1,2,3,4,5].map((i) => (
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
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold"
        style={{ background: '#D4AF37', color: '#0d1b2a', marginTop: 1 }}>
        {num}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{children}</p>
    </div>
  );
}
