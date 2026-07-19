'use client';

import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isSamsungOrEdge: boolean;
  /**
   * Trigger the native install prompt.
   * Waits up to timeoutMs for beforeinstallprompt if not yet captured.
   */
  triggerInstall: (timeoutMs?: number) => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const PWAContext = createContext<PWAContextType>({
  canInstall:      false,
  isInstalled:     false,
  isIOS:           false,
  isSamsungOrEdge: false,
  triggerInstall:  async () => 'unavailable',
});

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const promptRef  = useRef<BeforeInstallPromptEvent | null>(null);
  const waitersRef = useRef<Array<(e: BeforeInstallPromptEvent) => void>>([]);

  const [canInstall,      setCanInstall]      = useState(false);
  const [isInstalled,     setIsInstalled]     = useState(false);
  const [isIOS,           setIsIOS]           = useState(false);
  const [isSamsungOrEdge, setIsSamsungOrEdge] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;

    // Device/browser detection
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    setIsSamsungOrEdge(/SamsungBrowser|EdgA|EdgiOS/i.test(ua));

    // Already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      // iOS standalone
      (navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      // Mark as installed so install prompts never show again
      localStorage.setItem('pwa_installed', '1');
      setIsInstalled(true);
      return;
    }

    if (localStorage.getItem('pwa_installed') === '1') {
      setIsInstalled(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      // MUST preventDefault to keep the event for later use
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      promptRef.current = bip;
      setCanInstall(true);
      // Wake up any callers waiting for the prompt
      waitersRef.current.forEach((resolve) => resolve(bip));
      waitersRef.current = [];
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      promptRef.current = null;
      localStorage.setItem('pwa_installed', '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(
    async (timeoutMs = 10000): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
      let bip = promptRef.current;

      // If prompt not yet captured, wait for it
      if (!bip) {
        bip = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
          const timer = setTimeout(() => {
            waitersRef.current = waitersRef.current.filter((r) => r !== resolver);
            resolve(null);
          }, timeoutMs);

          const resolver = (e: BeforeInstallPromptEvent) => {
            clearTimeout(timer);
            resolve(e);
          };
          waitersRef.current.push(resolver);
        });
      }

      if (!bip) return 'unavailable';

      // Show the native browser install dialog
      await bip.prompt();
      const { outcome } = await bip.userChoice;
      promptRef.current = null;
      setCanInstall(false);

      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('pwa_installed', '1');
      }
      return outcome;
    },
    [],
  );

  return (
    <PWAContext.Provider value={{ canInstall, isInstalled, isIOS, isSamsungOrEdge, triggerInstall }}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}
