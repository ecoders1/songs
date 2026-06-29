import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUserToken } from '@/lib/userAuth';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = await verifyUserToken(token);
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  const supabase = getServiceSupabase();
  const { data: user, error } = await supabase
    .from('app_users')
    .select('id, full_name, email, status, created_at')
    .eq('id', payload.userId)
    .maybeSingle();

  if (error || !user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user });
}
