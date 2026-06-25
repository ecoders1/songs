'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {});
    }

    // Animate progress 0 → 100 over ~3 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 2;
      });
    }, 60);

    // Navigate to home after splash
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => router.push('/home'), 400);
    }, 3200);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center select-none transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      {/* Decorative rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-72 h-72 rounded-full absolute"
          style={{ border: '1px solid rgba(212,175,55,0.08)' }}
        />
        <div
          className="w-52 h-52 rounded-full absolute"
          style={{ border: '1px solid rgba(212,175,55,0.12)' }}
        />
        <div
          className="w-36 h-36 rounded-full absolute"
          style={{ border: '1px solid rgba(212,175,55,0.18)' }}
        />
      </div>

      {/* App Icon — globe.svg with glow */}
      <div className="relative mb-6 z-10">
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F0D060 50%, #B8960C 100%)',
            boxShadow: '0 0 60px rgba(212,175,55,0.4), 0 20px 40px rgba(0,0,0,0.3)',
          }}
        >
          <Image
            src="/globe.svg"
            alt="Apostolic Songs"
            width={72}
            height={72}
            priority
            style={{ filter: 'invert(1) sepia(1) saturate(0) brightness(0.1)' }}
          />
        </div>
        {/* Gold pulse ring */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            border: '2px solid rgba(212,175,55,0.5)',
            animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
          }}
        />
      </div>

      {/* App name */}
      <div className="text-center z-10 px-8">
        <h1 className="text-3xl font-extrabold text-white tracking-wide mb-1">
          Faarfannaa
        </h1>
        <p
          className="text-base font-semibold tracking-wider"
          style={{ color: '#D4AF37' }}
        >
          Apostolic Songs Afaan Oromoo
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Church Music · Offline Ready
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="mt-12 w-52 h-1 rounded-full overflow-hidden z-10"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #D4AF37, #F0D060, #D4AF37)',
          }}
        />
      </div>

      {/* Dots indicator */}
      <div className="flex gap-2 mt-5 z-10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: progress > (i + 1) * 28 ? '20px' : '6px',
              height: '6px',
              background: '#D4AF37',
              opacity: progress > i * 28 ? 1 : 0.25,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          70%, 100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
