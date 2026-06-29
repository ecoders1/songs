import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { UserProvider } from "@/context/UserContext";
import { PWAProvider } from "@/context/PWAContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Apostolic Songs Afaan Oromo",
  description: "Apostolic Church Songs in Afaan Oromo and other Ethiopian languages",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Apostolic Songs",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="om" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Preload critical assets for instant load */}
        <link rel="preload" href="/icons/icon-192.png" as="image" type="image/png" />
        {/* DNS prefetch for Supabase */}
        <link rel="dns-prefetch" href="https://lzznufriodxghmksokts.supabase.co" />
        <link rel="preconnect" href="https://lzznufriodxghmksokts.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <LanguageProvider>
          <UserProvider>
            <PWAProvider>
              <ThemeProvider>
                <PlayerProvider>{children}</PlayerProvider>
              </ThemeProvider>
            </PWAProvider>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
