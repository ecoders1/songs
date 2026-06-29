import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { UserProvider } from "@/context/UserContext";

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
    icon: "/icons/icon.png",
    apple: "/icons/icon.png",
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
        <link rel="preload" href="/icons/icon.png" as="image" type="image/png" />
        {/* DNS prefetch for Supabase */}
        <link rel="dns-prefetch" href="https://lzznufriodxghmksokts.supabase.co" />
        <link rel="preconnect" href="https://lzznufriodxghmksokts.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-white">
        <LanguageProvider>
          <UserProvider>
            <PlayerProvider>{children}</PlayerProvider>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
