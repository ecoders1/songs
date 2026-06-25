import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/auth';

const ADMIN_EMAIL = 'milkiyaas43@gmail.com';
const ADMIN_PASSWORD = 'Ayyuu@4313@';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signAdminToken();

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  return response;
}
