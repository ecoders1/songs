'use client';

import { useState, useEffect } from 'react';

type AppLanguage = 'oromo' | 'english' | 'amharic' | 'sidama' | 'arabic';

const LANGUAGES: { key: AppLanguage; label: string; native: string }[] = [
  { key: 'oromo', label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
  { key: 'english', label: 'English', native: 'English' },
  { key: 'amharic', label: 'Amharic', native: 'አማርኛ' },
  { key: 'sidama', label: 'Sidama', native: 'Sidaamu Afoo' },
  { key: 'arabic', label: 'Arabic', native: 'العربية' },
];

export default function SettingsPage() {
  const [appLanguage, setAppLanguage] = useState<AppLanguage>('oromo');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as AppLanguage | null;
    if (saved) setAppLanguage(saved);

    // PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleLanguageChange = (lang: AppLanguage) => {
    setAppLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deferredPrompt as any).prompt();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') {
      setPwaInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      const perm = await Notification.requestPermission();
      setNotificationsEnabled(perm === 'granted');
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-5" style={{ background: '#1a1a2e' }}>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Customize your experience</p>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Install PWA */}
        {pwaInstallable && (
          <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#D4AF37' }}>
                <svg width="20" height="20" fill="#1a1a2e" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Install App</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Add to home screen for offline use</p>
              </div>
            </div>
            <button
              onClick={handleInstallPWA}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#D4AF37', color: '#1a1a2e' }}
            >
              Install Now
            </button>
          </div>
        )}

        {/* Language */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">App Language</h2>
          <div className="space-y-1 rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            {LANGUAGES.map((lang, i) => (
              <button
                key={lang.key}
                onClick={() => handleLanguageChange(lang.key)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                style={{
                  background: appLanguage === lang.key ? '#FFF8E7' : 'white',
                  borderBottom: i < LANGUAGES.length - 1 ? '1px solid #f0f0f8' : 'none',
                }}
              >
                <div>
                  <p className="font-medium text-gray-800">{lang.label}</p>
                  <p className="text-xs text-gray-400">{lang.native}</p>
                </div>
                {appLanguage === lang.key && (
                  <svg width="18" height="18" fill="none" stroke="#D4AF37" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Notifications</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-medium text-gray-800">New Songs</p>
                <p className="text-xs text-gray-400">Get notified when new songs are added</p>
              </div>
              <button
                onClick={handleNotificationToggle}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: notificationsEnabled ? '#D4AF37' : '#e0e0e0' }}
                aria-label="Toggle notifications"
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: notificationsEnabled ? 'translateX(26px)' : 'translateX(4px)' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">About</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            {[
              { label: 'App Name', value: 'Faarfannaa' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Developer', value: 'Apostolic Church' },
            ].map((item, i, arr) => (
              <div
                key={item.label}
                className="flex justify-between px-4 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #f0f0f8' : 'none' }}
              >
                <span className="text-gray-500 text-sm">{item.label}</span>
                <span className="text-gray-800 text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-4 text-center">
          <p className="text-xs text-gray-300">Apostolic Songs Afaan Oromoo</p>
          <p className="text-xs text-gray-300">Made with ❤️ for the Church</p>
        </div>
      </div>
    </div>
  );
}
