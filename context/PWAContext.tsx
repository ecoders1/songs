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
  /**
   * Trigger the native install prompt.
   * If the browser hasn't fired beforeinstallprompt yet, this waits up to
   * `timeoutMs` milliseconds for it — solving the race condition where the
   * install prompt is called immediately after page load.
   */
  triggerInstall: (timeoutMs?: number) => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

const PWAContext = createContext<PWAContextType>({
  canInstall:     false,
  isInstalled:    false,
  isIOS:          false,
  triggerInstall: async () => 'unavailable',
});

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const promptRef   = useRef<BeforeInstallPromptEvent | null>(null);
  // Resolvers waiting for beforeinstallprompt to fire
  const waitersRef  = useRef<Array<(e: BeforeInstallPromptEvent) => void>>([]);

  const [canInstall,  setCanInstall]  = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS,       setIsIOS]       = useState(false);

  useEffect(() => {
    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Already installed as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      promptRef.current = bip;
      setCanInstall(true);
      // Notify any callers that were waiting for the prompt
      waitersRef.current.forEach((resolve) => resolve(bip));
      waitersRef.current = [];
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      promptRef.current = null;
      localStorage.setItem('pwa_installed', '1');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(
    async (timeoutMs = 6000): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
      // Already have the prompt — fire immediately
      let bip = promptRef.current;

      if (!bip) {
        // Wait for beforeinstallprompt up to timeoutMs
        bip = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
          const timer = setTimeout(() => {
            // Remove this waiter and resolve null (timeout)
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
    <PWAContext.Provider value={{ canInstall, isInstalled, isIOS, triggerInstall }}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}
