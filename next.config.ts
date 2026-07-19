import type { NextConfig } from "next";

// Inject a unique build timestamp into the service worker on every deploy.
// This ensures the browser always detects a new SW and triggers auto-update.
const BUILD_ID = Date.now().toString();

const nextConfig: NextConfig = {
  // Increase body size limit for large audio file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '55mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      // Allow images from both deployment domains
      {
        protocol: "https",
        hostname: "songscom.vercel.app",
      },
      {
        protocol: "https",
        hostname: "faarsaa.vercel.app",
      },
    ],
  },
  async headers() {
    return [
      // Security + PWA headers on all pages
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Allow PWA install on both domains
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
      // Service worker — must be served with correct MIME and no-cache
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          // Embed the build ID so the SW file content changes on every deploy
          { key: "X-SW-Build-ID", value: BUILD_ID },
        ],
      },
      // Manifest — short cache so updates propagate quickly
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      // CORS — public read-only API
      {
        source: "/api/songs/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        source: "/api/artists/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      // Admin API — same origin only
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
