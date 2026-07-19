'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut]   = useState(false);
  const [show, setShow]         = useState(false);

  useEffect(() => {
    // ── Service Worker: register + auto-update on every open ──────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((reg) => {
          // Force-check for updated SW every time the app opens
          reg.update().catch(() => {});

          // SW update found while app is open — activate it immediately
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                nw.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(() => {});

      // SW broadcasts SW_UPDATED after activate — reload after exactly 1 second
      // so users always get the latest version automatically
      let reloadScheduled = false;
      const scheduleReload = () => {
        if (reloadScheduled) return;
        reloadScheduled = true;
        setTimeout(() => window.location.reload(), 1000);
      };

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') scheduleReload();
      });

      // controllerchange = new SW took control — also reload (deduped)
      navigator.serviceWorker.addEventListener('controllerchange', scheduleReload);
    }

    // ── Splash screen ─────────────────────────────────────────────────────
    // Skip splash on repeat visits within the same session
    const visited = sessionStorage.getItem('visited');
    if (visited) {
      router.replace('/home');
      return;
    }

    // First visit — show 1s splash, trigger install prompt, then go to /home
    sessionStorage.setItem('visited', '1');
    sessionStorage.setItem('show_install_prompt', '1');
    setShow(true);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 8;
      });
    }, 60);

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => router.replace('/home'), 250);
    }, 1000);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [router]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center select-none transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 50%, #0f3460 100%)' }}
    >
      {[280, 220, 160].map((size, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{ width: size, height: size, border: `1px solid rgba(212,175,55,${0.06 + i * 0.05})` }} />
      ))}

      <div className="relative mb-5 z-10">
        <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center"
          style={{ boxShadow: '0 0 50px rgba(212,175,55,0.35), 0 16px 40px rgba(0,0,0,0.5)', border: '3px solid rgba(212,175,55,0.5)' }}>
          <Image src="/icons/icon-192.png" alt="Faarfannaa Afaan Oromo" width={128} height={128} priority className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 rounded-full"
          style={{ border: '2px solid rgba(212,175,55,0.4)', animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
      </div>

      <div className="text-center z-10 px-6">
        <h1 className="text-2xl font-extrabold text-white tracking-wide leading-tight">Faarfannaa</h1>
        <h2 className="text-xl font-bold mt-0.5" style={{ color: '#D4AF37' }}>Afaan Oromo</h2>
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Church Music · Works Offline</p>
      </div>

      <div className="mt-10 w-52 h-1 rounded-full overflow-hidden z-10" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all duration-75"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #B8960C, #D4AF37, #F0D060)' }} />
      </div>

      <div className="flex gap-2 mt-4 z-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-full transition-all duration-300"
            style={{
              width: progress > (i + 1) * 28 ? '18px' : '6px',
              height: '6px',
              background: '#D4AF37',
              opacity: progress > i * 28 ? 1 : 0.25,
            }} />
        ))}
      </div>

      <style>{`
        @keyframes ping {
          0%       { transform: scale(1);   opacity: 0.5; }
          80%, 100%{ transform: scale(1.3); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
