'use client';

/**
 * NotificationContext
 *
 * Provides:
 *  - notificationPermission  — current Notification.permission state
 *  - requestPermission()     — asks the user; resolves to the new permission value
 *  - showLocalNotification() — fires a local (non-push) notification via the SW
 *  - isSupported             — false on iOS < 16.4 or browsers without Notification API
 *
 * Usage:
 *   const { notificationPermission, requestPermission, showLocalNotification } = useNotifications();
 */

import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react';

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  /** URL to open when the user taps the notification */
  url?: string;
  tag?: string;
  /** If true, replaces any existing notification with the same tag */
  renotify?: boolean;
}

interface NotificationContextType {
  /** Whether the Notifications API is available in this browser/environment */
  isSupported: boolean;
  /** Current Notification.permission value — 'default' | 'granted' | 'denied' */
  notificationPermission: NotificationPermission;
  /** Ask for notification permission. Returns the resulting permission. */
  requestPermission: () => Promise<NotificationPermission>;
  /**
   * Show a local notification (no push server needed).
   * Uses the registered Service Worker so it works even when the tab is hidden.
   * Falls back to Notification() constructor when SW is unavailable.
   */
  showLocalNotification: (opts: NotificationOptions) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  isSupported:            false,
  notificationPermission: 'default',
  requestPermission:      async () => 'default',
  showLocalNotification:  async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default');

  // ── Detect support + read current permission on mount ─────────────────────
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    setIsSupported(supported);
    if (supported) setNotificationPermission(Notification.permission);
  }, []);

  // ── Keep state in sync if the user changes permission in browser settings ─
  useEffect(() => {
    if (!isSupported) return;
    // PermissionStatus listener (not available in all browsers — best-effort)
    let cleanup: (() => void) | undefined;
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((status) => {
        const handler = () => setNotificationPermission(Notification.permission);
        status.addEventListener('change', handler);
        cleanup = () => status.removeEventListener('change', handler);
      })
      .catch(() => {});
    return () => cleanup?.();
  }, [isSupported]);

  // ── Request permission ─────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied')  return 'denied';

    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    return result;
  }, [isSupported]);

  // ── Show a local (non-server-push) notification ────────────────────────────
  const showLocalNotification = useCallback(async (opts: NotificationOptions): Promise<void> => {
    if (!isSupported || Notification.permission !== 'granted') return;

    const { title, body, icon = '/icons/icon-192.png', badge = '/icons/icon-192.png', url = '/home', tag, renotify } = opts;

    // Prefer SW-based notification (works when tab is hidden / screen is locked)
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        renotify,
        data: { url },
        // @ts-expect-error — vibrate is valid but not in all TS lib defs
        vibrate: [200, 100, 200],
      });
      return;
    } catch {
      // SW not ready — fall back to Notification constructor
    }

    // Fallback: regular Notification (works in foreground)
    try {
      const n = new Notification(title, { body, icon, badge, tag });
      if (url) n.onclick = () => { window.focus(); window.location.href = url; };
    } catch {
      // Silently ignore (e.g., iOS 15 without SW push support)
    }
  }, [isSupported]);

  return (
    <NotificationContext.Provider
      value={{ isSupported, notificationPermission, requestPermission, showLocalNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
