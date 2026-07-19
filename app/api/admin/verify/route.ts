import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  const valid = await verifyAdminToken(token);
  if (!valid) return NextResponse.json({ authenticated: false }, { status: 401 });

  return NextResponse.json({ authenticated: true });
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_token');
  return response;
}
