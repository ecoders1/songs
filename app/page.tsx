'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }

    const interval = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(interval); return 100; } return p + 2; });
    }, 60);

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => router.push('/home'), 400);
    }, 3200);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center select-none transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #1a2744 50%, #0f3460 100%)' }}
    >
      {/* Decorative rings */}
      {[280, 220, 160].map((size, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{ width: size, height: size, border: `1px solid rgba(212,175,55,${0.06 + i * 0.05})` }} />
      ))}

      {/* Church logo */}
      <div className="relative mb-5 z-10">
        <div
          className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center"
          style={{ boxShadow: '0 0 50px rgba(212,175,55,0.35), 0 16px 40px rgba(0,0,0,0.5)', border: '3px solid rgba(212,175,55,0.5)' }}
        >
          <Image
            src="/icons/church-logo.png"
            alt="Apostolic Songs"
            width={128}
            height={128}
            priority
            className="w-full h-full object-cover"
          />
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full"
          style={{ border: '2px solid rgba(212,175,55,0.4)', animation: 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      </div>

      {/* App name */}
      <div className="text-center z-10 px-6">
        <h1 className="text-2xl font-extrabold text-white tracking-wide leading-tight">
          Apostolic Songs
        </h1>
        <h2 className="text-xl font-bold mt-0.5" style={{ color: '#D4AF37' }}>
          Afaan Oromo
        </h2>
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Church Music · Works Offline
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-10 w-52 h-1 rounded-full overflow-hidden z-10"
        style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all duration-100"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #B8960C, #D4AF37, #F0D060)' }} />
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mt-4 z-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-full transition-all duration-500"
            style={{ width: progress > (i + 1) * 28 ? '18px' : '6px', height: '6px',
              background: '#D4AF37', opacity: progress > i * 28 ? 1 : 0.25 }} />
        ))}
      </div>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.5; }
          80%, 100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
