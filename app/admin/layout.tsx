'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setChecking(false);
      return;
    }
    fetch('/api/admin/verify')
      .then((res) => {
        if (!res.ok) router.push('/admin/login');
        else setChecking(false);
      })
      .catch(() => router.push('/admin/login'));
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}>
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400 border-t-transparent spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await fetch('/api/admin/verify', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/songs', label: 'Songs', icon: '🎵' },
    { href: '/admin/categories', label: 'Categories', icon: '📂' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#f8f8fc' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col" style={{ background: '#1a1a2e' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h1 className="font-bold text-white text-lg">Faarfannaa</h1>
          <p className="text-xs mt-0.5" style={{ color: '#D4AF37' }}>Admin Panel</p>
        </div>
        <nav className="flex-1 p-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all"
              style={{
                background: pathname.startsWith(link.href) ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: pathname.startsWith(link.href) ? '#D4AF37' : 'rgba(255,255,255,0.7)',
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white shadow-sm">
          <h1 className="font-bold text-gray-800">Admin</h1>
          <div className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: pathname.startsWith(link.href) ? '#D4AF37' : '#f0f0f8',
                  color: pathname.startsWith(link.href) ? '#1a1a2e' : '#666',
                  fontWeight: pathname.startsWith(link.href) ? 600 : 400,
                }}
              >
                {link.icon}
              </Link>
            ))}
            <button onClick={handleLogout} className="text-xs text-gray-400 px-2">Out</button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
