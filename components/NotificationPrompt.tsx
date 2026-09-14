'use client';

/**
 * NotificationPrompt
 *
 * A non-intrusive contextual prompt that asks the user to enable notifications.
 *
 * When to show:
 *  - Notification API is supported
 *  - Permission is still 'default' (not yet asked)
 *  - User has visited /home at least once (engaged, not first-second bounce)
 *  - Not permanently dismissed (localStorage 'notif_dismissed')
 *
 * It renders as a compact bottom card — same visual language as InstallPrompt.
 * Disappears automatically once the user grants, denies, or dismisses.
 */

import { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';

type Phase = 'idle' | 'visible' | 'asking' | 'granted' | 'denied';

export default function NotificationPrompt() {
  const { isSupported, notificationPermission, requestPermission } = useNotifications();
  const [phase, setPhase] = useState<Phase>('idle');

  // ── Decide whether to show the prompt ─────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;
    if (notificationPermission !== 'default') return;
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('notif_dismissed') === '1') return;

    // Wait 3 seconds after mount — let the user settle into the page first
    const timer = setTimeout(() => setPhase('visible'), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, notificationPermission]);

  // ── Sync external permission changes (e.g. browser settings) ─────────────
  useEffect(() => {
    if (notificationPermission === 'granted') setPhase('granted');
    if (notificationPermission === 'denied')  setPhase('denied');
  }, [notificationPermission]);

  // ── Auto-hide success / denied feedback after 2.5s ────────────────────────
  useEffect(() => {
    if (phase !== 'granted' && phase !== 'denied') return;
    const t = setTimeout(() => setPhase('idle'), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'idle') return null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEnable = async () => {
    setPhase('asking');
    const result = await requestPermission();
    setPhase(result === 'granted' ? 'granted' : 'denied');
  };

  const handleDismiss = () => {
    localStorage.setItem('notif_dismissed', '1');
    setPhase('idle');
  };

  // ── Success feedback ───────────────────────────────────────────────────────
  if (phase === 'granted') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', bottom: 88, left: 16, right: 16, zIndex: 60,
          borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(135deg, #0d3320 0%, #0f5c35 100%)',
          border: '1px solid rgba(52,199,89,0.45)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          animation: 'notif-slide-up 0.3s ease',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg,#34C759,#5EDB7A,#34C759)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <span style={{ fontSize: 24 }} aria-hidden="true">🔔</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff' }}>
              Beeksifni eeyyamame!
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
              Beeksiftoota faarfannaa haaraa ni argatta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Denied feedback ────────────────────────────────────────────────────────
  if (phase === 'denied') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', bottom: 88, left: 16, right: 16, zIndex: 60,
          borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          animation: 'notif-slide-up 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <span style={{ fontSize: 22 }} aria-hidden="true">🔕</span>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Beeksifni hin eeyyamamne. Browser settings irraa jijjiiruu dandeessa.
          </p>
        </div>
      </div>
    );
  }

  // ── Main prompt card ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes notif-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="false"
        aria-label="Beeksifta eeyyamsiisi"
        style={{
          position: 'fixed', bottom: 88, left: 16, right: 16, zIndex: 60,
          borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2744 60%, #0f3460 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'notif-slide-up 0.35s ease',
        }}
      >
        {/* Gold accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #D4AF37, #F0D060, #D4AF37)' }} />

        <div style={{ padding: '14px 16px 16px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            {/* Bell icon */}
            <div style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: 12,
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}
              aria-hidden="true"
            >
              🔔
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.3 }}>
                Beeksifta eeyyamsiisi
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                Faarfannaa haaraa fi ergaalee barbaachisaa yeroo argaman beektu.
              </p>
            </div>

            {/* Dismiss X */}
            <button
              onClick={handleDismiss}
              aria-label="Cufii"
              style={{
                flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1,
                padding: '2px 4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleEnable}
              disabled={phase === 'asking'}
              aria-busy={phase === 'asking'}
              style={{
                flex: 1, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: phase === 'asking'
                  ? 'rgba(212,175,55,0.4)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #D4AF37 100%)',
                color: '#0d1b2a', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity 0.2s',
              }}
            >
              {phase === 'asking' ? (
                <>
                  <span
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(13,27,42,0.3)',
                      borderTopColor: '#0d1b2a',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                    aria-hidden="true"
                  />
                  Eegaa…
                </>
              ) : (
                <>🔔 Eeyyami</>
              )}
            </button>

            <button
              onClick={handleDismiss}
              style={{
                flex: 'none', height: 42, paddingInline: 18, borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 13,
              }}
            >
              Amma miti
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
