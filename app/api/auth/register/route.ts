import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, signUserToken } from '@/lib/userAuth';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Simple rate-limit: max 3 registrations per IP per hour
const regAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = regAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    regAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 3;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many registrations. Try again later.' }, { status: 429 });
  }

  let body: { full_name?: string; email?: string; password?: string; device_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { full_name, email, password, device_id } = body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 6) {
    return NextResponse.json({ error: 'Full name must be at least 6 characters' }, { status: 400 });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 5) {
    return NextResponse.json({ error: 'Password must be at least 5 characters' }, { status: 400 });
  }
  if (!device_id || typeof device_id !== 'string' || device_id.trim().length < 8) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // ── Check email uniqueness ───────────────────────────────────────────────────
  const { data: existingEmail } = await supabase
    .from('app_users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json({ error: 'This email is already registered' }, { status: 409 });
  }

  // ── Check device uniqueness ──────────────────────────────────────────────────
  const { data: existingDevice } = await supabase
    .from('app_users')
    .select('id, email')
    .eq('device_id', device_id.trim())
    .maybeSingle();

  if (existingDevice) {
    return NextResponse.json(
      { error: 'This device already has a registered account. Only one account per device is allowed.' },
      { status: 409 },
    );
  }

  // ── Hash password & insert ───────────────────────────────────────────────────
  const password_hash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from('app_users')
    .insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      device_id: device_id.trim(),
      status: 'pending',
    })
    .select('id, full_name, email, status')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique violation — race condition on email or device_id
      return NextResponse.json({ error: 'Email or device already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }

  // Issue a token right away — status is "pending", front-end shows waiting screen
  const token = await signUserToken(user.id, user.email);

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, full_name: user.full_name, email: user.email, status: user.status },
  }, { status: 201 });

  response.cookies.set('user_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return response;
}
