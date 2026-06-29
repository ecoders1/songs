import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword, signUserToken } from '@/lib/userAuth';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  let body: { email?: string; password?: string; device_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password, device_id } = body;

  if (!email || !password || !device_id) {
    return NextResponse.json({ error: 'Email, password and device ID are required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: user, error } = await supabase
    .from('app_users')
    .select('id, full_name, email, password_hash, device_id, status')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error || !user) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  // Enforce: only the registered device can log in
  if (user.device_id !== device_id.trim()) {
    return NextResponse.json(
      { error: 'This account was registered on a different device. You can only sign in from the device you registered with.' },
      { status: 403 },
    );
  }

  loginAttempts.delete(ip);

  const token = await signUserToken(user.id, user.email);

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, full_name: user.full_name, email: user.email, status: user.status },
  });

  response.cookies.set('user_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return response;
}
