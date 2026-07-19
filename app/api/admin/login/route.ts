import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';

// Credentials — read from env vars (set these in Vercel dashboard)
// Fallback values used if env vars are missing so login always works
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'milkiyaas43@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ayyuu@4313@';

// Brute-force protection
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim() !== ADMIN_EMAIL ||
    password !== ADMIN_PASSWORD
  ) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  loginAttempts.delete(ip);
  const token = await signAdminToken();

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',   // 'lax' works with same-site fetch; 'strict' blocks it on Vercel
    maxAge: 60 * 60 * 8,
    path: '/',
  });

  return response;
}
