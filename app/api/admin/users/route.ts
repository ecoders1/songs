import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

// GET /api/admin/users — list all users, optional ?status=pending|approved|rejected
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const supabase = getServiceSupabase();
  let query = supabase
    .from('app_users')
    .select('id, full_name, email, status, device_id, created_at, approved_at, rejected_at, reset_at')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data || [] });
}

// PATCH /api/admin/users — approve / reject / reset a user
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; action?: 'approve' | 'reject' | 'reset' };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { id, action } = body;
  if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 });

  const validActions = ['approve', 'reject', 'reset'];
  if (!validActions.includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const updateMap: Record<string, Record<string, unknown>> = {
    approve: { status: 'approved', approved_at: now, rejected_at: null },
    reject:  { status: 'rejected', rejected_at: now, approved_at: null },
    reset:   { status: 'pending',  approved_at: null, rejected_at: null, reset_at: now },
  };

  const { data, error } = await supabase
    .from('app_users')
    .update(updateMap[action as keyof typeof updateMap])
    .eq('id', id)
    .select('id, full_name, email, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}

// DELETE /api/admin/users?id=xxx — delete a user
export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
