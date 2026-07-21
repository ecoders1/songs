'use client';

import { useState, useEffect } from 'react';
import { useLanguage, UI_TEXT, type AppLanguage } from '@/context/LanguageContext';

const LANGUAGES: { key: AppLanguage; label: string; native: string }[] = [
  { key: 'oromo',   label: 'Afaan Oromoo', native: 'Afaan Oromoo' },
  { key: 'english', label: 'English',      native: 'English' },
  { key: 'amharic', label: 'Amharic',      native: 'አማርኛ' },
  { key: 'sidama',  label: 'Sidama',       native: 'Sidaamu Afoo' },
  { key: 'arabic',  label: 'Arabic',       native: 'العربية' },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
        <h1 className="text-xl font-bold text-white">{t.settings}</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {UI_TEXT['english'].settings} / {UI_TEXT['amharic'].settings}
        </p>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Install PWA */}
        {pwaInstallable && (
          <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#D4AF37' }}>
                <svg width="20" height="20" fill="#1a1a2e" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">{t.installApp}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{t.installDesc}</p>
              </div>
            </div>
            <button
              onClick={handleInstallPWA}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#D4AF37', color: '#1a1a2e' }}
            >
              {t.installNow}
            </button>
          </div>
        )}

        {/* Language */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.appLanguage}</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            {LANGUAGES.map((lang, i) => (
              <button
                key={lang.key}
                onClick={() => setLanguage(lang.key)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                style={{
                  background: language === lang.key ? '#FFF8E7' : 'white',
                  borderBottom: i < LANGUAGES.length - 1 ? '1px solid #f0f0f8' : 'none',
                }}
              >
                <div>
                  <p className="font-medium text-gray-800">{lang.label}</p>
                  <p className="text-xs text-gray-400">{lang.native}</p>
                </div>
                {language === lang.key && (
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.notifications}</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="font-medium text-gray-800">{t.newSongs}</p>
                <p className="text-xs text-gray-400">{t.newSongsNotif}</p>
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

        {/* Contact */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.contact}</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            <a
              href="https://t.me/milkibn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-gray-50"
              style={{ borderBottom: '1px solid #f0f0f8' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0088cc' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.697l-2.95-.924c-.64-.203-.654-.64.136-.948l11.526-4.445c.534-.194 1.001.13.37.868z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Telegram</p>
                <p className="text-xs text-gray-400">@milkibn</p>
              </div>
              <svg width="16" height="16" fill="none" stroke="#ccc" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="https://t.me/aposotolicchurch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-gray-50"
              style={{ borderBottom: '1px solid #f0f0f8' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#005fa3' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.697l-2.95-.924c-.64-.203-.654-.64.136-.948l11.526-4.445c.534-.194 1.001.13.37.868z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{t.telegramChannel}</p>
                <p className="text-xs text-gray-400">@aposotolicchurch</p>
              </div>
              <svg width="16" height="16" fill="none" stroke="#ccc" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="https://m.youtube.com/@oro_waliif"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-gray-50"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FF0000' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">YouTube</p>
                <p className="text-xs text-gray-400">Oro Waliif</p>
              </div>
              <svg width="16" height="16" fill="none" stroke="#ccc" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        {/* About */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.about}</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8e8f0' }}>
            {[
              { label: t.appName,   value: 'Faarfannaa' },
              { label: t.version,   value: '1.0.0' },
              { label: t.developer, value: 'Apostolic Church' },
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

        <div className="pb-8 text-center space-y-1">
          <p className="text-xs text-gray-300">Apostolic Songs Afaan Oromoo</p>
          <p className="text-xs text-gray-300">Made with ❤️ for the Church</p>
        </div>
      </div>
    </div>
  );
}
