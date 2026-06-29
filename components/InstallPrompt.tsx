'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePWA } from '@/context/PWAContext';

/**
 * Full-screen install push shown right after sign-in.
 * - Android/Chrome: fires native "Add to Home Screen" prompt immediately,
 *   then shows a full-screen confirmation card.
 * - iOS Safari: full-screen card with step-by-step install instructions.
 * - Already installed / dismissed before: nothing shown.
 */
export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = usePWA();
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const shouldShow = sessionStorage.getItem('show_install_prompt') === '1';
    if (!shouldShow) return;

    sessionStorage.removeItem('show_install_prompt');

    if (canInstall) {
      // Android/Chrome — show full-screen card first, then trigger prompt on button tap
      setTimeout(() => setShow(true), 600);
    } else if (isIOS) {
      // iOS — show instruction sheet
      setTimeout(() => setShowIOSGuide(true), 600);
    } else {
      // Fallback (desktop or unsupported browser)
      setTimeout(() => setShow(true), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = async () => {
    if (installing) return;
    setInstalling(true);
    const outcome = await triggerInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      setInstalled(true);
      setTimeout(() => setShow(false), 2000);
    } else if (outcome === 'unavailable') {
      // Prompt not available — just close
      setShow(false);
    }
    // if dismissed, stay open so user can try again or skip
  };

  // ── Full-screen Android/Chrome install card ────────────────────────────────
  if (show && !isInstalled) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-end"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      >
        {/* Card slides up from bottom */}
        <div
          className="w-full rounded-t-3xl px-6 pt-6 pb-8 shadow-2xl"
          style={{
            background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 60%, #0f3460 100%)',
            border: '1px solid rgba(212,175,55,0.25)',
            maxWidth: 480,
          }}
        >
          {installed ? (
            /* Success state */
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E' }}>
                <svg width="32" height="32" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-white font-bold text-lg">App Installed!</p>
              <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Apostolic Songs is now on your home screen
              </p>
            </div>
          ) : (
            <>
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.2)' }} />

              {/* App info */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
                  style={{ border: '2px solid rgba(212,175,55,0.5)', boxShadow: '0 0 20px rgba(212,175,55,0.2)' }}>
                  <Image src="/icons/icon.png" alt="Apostolic Songs" width={64} height={64} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-extrabold text-lg leading-tight">Apostolic Songs</p>
                  <p className="text-sm font-semibold" style={{ color: '#D4AF37' }}>Afaan Oromoo</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#D4AF37">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                    <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Free</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { icon: '🎵', label: 'Afaan Oromo' },
                  { icon: '📶', label: 'Works Offline' },
                  { icon: '⚡', label: 'Fast & Free' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-1 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-xs text-center font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Install button */}
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2.5 transition-all active:scale-95"
                style={{
                  background: installing ? '#b8960c' : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 100%)',
                  color: '#0d1b2a',
                  boxShadow: '0 4px 24px rgba(212,175,55,0.4)',
                }}
              >
                {installing ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'rgba(13,27,42,0.3)', borderTopColor: '#0d1b2a' }} />
                    Installing...
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

              {/* Skip */}
              <button
                onClick={() => setShow(false)}
                className="w-full mt-3 py-2.5 text-sm text-center rounded-xl transition-all active:opacity-60"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Maybe later
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Full-screen iOS instruction card ──────────────────────────────────────
  if (showIOSGuide && !isInstalled) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-end"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      >
        <div
          className="w-full rounded-t-3xl px-6 pt-6 pb-8 shadow-2xl"
          style={{
            background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 60%, #0f3460 100%)',
            border: '1px solid rgba(212,175,55,0.25)',
            maxWidth: 480,
          }}
        >
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.2)' }} />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(212,175,55,0.5)' }}>
              <Image src="/icons/icon.png" alt="Apostolic Songs" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-extrabold text-white text-lg">Install Apostolic Songs</p>
              <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>Add to Home Screen — Free</p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            <Step num={1}>
              Tap the{' '}
              <span className="inline-flex items-center gap-1 font-bold text-white">
                Share
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>{' '}
              button at the bottom of Safari
            </Step>
            <Step num={2}>
              Scroll and tap <span className="font-bold text-white">"Add to Home Screen"</span>
            </Step>
            <Step num={3}>
              Tap <span className="font-bold text-white">"Add"</span> — App is installed! 🎉
            </Step>
          </div>

          {/* Arrow pointing down to Safari bar */}
          <div className="flex flex-col items-center mb-4 gap-1">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Tap the share button below ↓</p>
            <svg width="20" height="20" fill="none" stroke="rgba(212,175,55,0.6)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <button
            onClick={() => setShowIOSGuide(false)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-center transition-all active:scale-95"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            Got it — I'll install it now
          </button>

          <button
            onClick={() => setShowIOSGuide(false)}
            className="w-full mt-2 py-2 text-sm text-center"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-extrabold mt-0.5"
        style={{ background: '#D4AF37', color: '#0d1b2a' }}
      >
        {num}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{children}</p>
    </div>
  );
}
