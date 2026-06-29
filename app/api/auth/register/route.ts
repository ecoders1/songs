import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, signUserToken } from '@/lib/userAuth';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Rate-limit: max 2 registrations per IP per 24 hours
const regAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = regAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    regAttempts.set(ip, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 2;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Registration limit reached for this network. Try again tomorrow.' },
      { status: 429 },
    );
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
  const cleanEmail = email.trim().toLowerCase();
  const cleanDevice = device_id.trim();

  // ── Check device uniqueness FIRST ───────────────────────────────────────────
  // One account per device — no matter what email is used
  const { data: existingDevice } = await supabase
    .from('app_users')
    .select('id, email, status')
    .eq('device_id', cleanDevice)
    .maybeSingle();

  if (existingDevice) {
    return NextResponse.json(
      {
        error: `This device already has an account registered with ${existingDevice.email}. ` +
               `Only one account per device is allowed. Please sign in instead.`,
      },
      { status: 409 },
    );
  }

  // ── Check IP-based registration (extra layer against clearing localStorage) ─
  // Allow at most 1 approved/pending account per IP to prevent abuse
  if (ip !== 'unknown') {
    const { data: ipAccounts } = await supabase
      .from('app_users')
      .select('id, status')
      .eq('registration_ip', ip)
      .in('status', ['pending', 'approved']);

    if (ipAccounts && ipAccounts.length >= 2) {
      return NextResponse.json(
        { error: 'Too many accounts registered from this network. Contact admin for help.' },
        { status: 429 },
      );
    }
  }

  // ── Check email uniqueness ───────────────────────────────────────────────────
  const { data: existingEmail } = await supabase
    .from('app_users')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json(
      { error: 'This email is already registered. Please sign in or use a different email.' },
      { status: 409 },
    );
  }

  // ── Hash password & insert ───────────────────────────────────────────────────
  const password_hash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from('app_users')
    .insert({
      full_name: full_name.trim(),
      email: cleanEmail,
      password_hash,
      device_id: cleanDevice,
      registration_ip: ip !== 'unknown' ? ip : null,
      status: 'pending',
    })
    .select('id, full_name, email, status')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email or device already registered.' }, { status: 409 });
    }
    // registration_ip column may not exist yet — retry without it
    const { data: user2, error: error2 } = await supabase
      .from('app_users')
      .insert({
        full_name: full_name.trim(),
        email: cleanEmail,
        password_hash,
        device_id: cleanDevice,
        status: 'pending',
      })
      .select('id, full_name, email, status')
      .single();

    if (error2) {
      if (error2.code === '23505') {
        return NextResponse.json({ error: 'Email or device already registered.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
    }

    const token2 = await signUserToken(user2!.id, user2!.email);
    const response2 = NextResponse.json({
      success: true,
      user: { id: user2!.id, full_name: user2!.full_name, email: user2!.email, status: user2!.status },
    }, { status: 201 });
    response2.cookies.set('user_token', token2, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
    return response2;
  }

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
