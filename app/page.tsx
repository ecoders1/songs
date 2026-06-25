'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Navigate after splash
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => router.push('/home'), 400);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }}
    >
      {/* Cross + Music icon */}
      <div className="mb-8 relative">
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
          {/* Cross */}
          <rect x="40" y="5" width="10" height="80" rx="5" fill="#D4AF37" />
          <rect x="15" y="28" width="60" height="10" rx="5" fill="#D4AF37" />
          {/* Music note */}
          <circle cx="68" cy="70" r="7" fill="#F0D060" opacity="0.85" />
          <rect x="74" y="45" width="5" height="25" rx="2.5" fill="#F0D060" opacity="0.85" />
          <rect x="74" y="45" width="14" height="4" rx="2" fill="#F0D060" opacity="0.85" />
        </svg>
        {/* Glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ background: '#D4AF37', transform: 'scale(1.4)' }}
        />
      </div>

      {/* App Name */}
      <h1 className="text-3xl font-bold text-white tracking-wide mb-1">
        Faarfannaa
      </h1>
      <p className="text-sm mb-12" style={{ color: '#D4AF37' }}>
        Apostolic Songs Afaan Oromoo
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
          }}
        />
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: '#D4AF37',
              opacity: progress > i * 33 ? 1 : 0.3,
              transition: 'opacity 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
