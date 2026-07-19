import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { PWAProvider } from "@/context/PWAContext";
import { ThemeProvider } from "@/context/ThemeContext";

// Works on both songscom.vercel.app and faarsaa.vercel.app
// VERCEL_URL is set automatically by Vercel for the current deployment domain
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://songscom.vercel.app');

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Faarfannaa Afaan Oromo",
  description: "Faarfannaa Afaan Oromo — Sagalee Amantii Apostolic. Works offline. Install free.",
  manifest: "/manifest.json",
  applicationName: "Faarfannaa Afaan Oromo",
  keywords: ["Faarfannaa", "Afaan Oromo", "Apostolic", "Songs", "Church Music", "Ethiopian"],
  authors: [{ name: "Apostolic Church" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Faarfannaa Afaan Oromo",
    startupImage: "/icons/icon-512.png",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Faarfannaa Afaan Oromo",
    description: "Faarfannaa Afaan Oromo — Sagalee Amantii Apostolic, free, works offline",
    type: "website",
    locale: "om",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Faarfannaa Afaan Oromo" }],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D4AF37" },
    { media: "(prefers-color-scheme: dark)",  color: "#1a1a2e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="om" className="h-full">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Android / Chrome PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Faarfannaa Afaan Oromo" />

        {/* iOS / Safari PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Faarfannaa Afaan Oromo" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />

        {/* Microsoft Tiles (Windows / Edge) */}
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <meta name="msapplication-TileColor" content="#1a1a2e" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Preload critical assets */}
        <link rel="preload" href="/icons/icon-192.png" as="image" type="image/png" />
        {/* Explicit favicon — use the Apostolic Songs logo, not default SVGs */}
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="shortcut icon" href="/icons/icon-192.png" type="image/png" />

        {/* Supabase connection optimization */}
        <link rel="dns-prefetch" href="https://lzznufriodxghmksokts.supabase.co" />
        <link rel="preconnect" href="https://lzznufriodxghmksokts.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <LanguageProvider>
          <PWAProvider>
            <ThemeProvider>
              <PlayerProvider>{children}</PlayerProvider>
            </ThemeProvider>
          </PWAProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
