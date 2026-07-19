import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ALLOWED_BUCKETS = ['audio', 'images'] as const;
const ALLOWED_AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * POST /api/admin/upload
 *
 * Two modes:
 *
 * 1. signed-url (recommended — browser uploads directly to Supabase, no Vercel size limit)
 *    Body: { mode: 'signed-url', bucket: 'audio'|'images', filename: 'song.mp3', contentType: 'audio/mpeg' }
 *    Returns: { signedUrl, token, path, publicUrl }
 *    Browser then does: PUT signedUrl with the file blob
 *
 * 2. proxy (fallback for small files ≤ 4MB)
 *    Body: FormData with file + bucket fields
 *    Returns: { url, path }
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized — please log in again' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const ct = req.headers.get('content-type') || '';

  // ── Mode 1: signed URL (direct browser-to-Supabase upload) ────────────────
  if (ct.includes('application/json')) {
    let body: { mode?: string; bucket?: string; filename?: string; contentType?: string };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { bucket = 'audio', filename, contentType } = body;

    if (!ALLOWED_BUCKETS.includes(bucket as 'audio' | 'images')) {
      return NextResponse.json({ error: `Invalid bucket. Use: ${ALLOWED_BUCKETS.join(', ')}` }, { status: 400 });
    }
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const allowed = bucket === 'audio' ? ALLOWED_AUDIO_EXTS : ALLOWED_IMAGE_EXTS;
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Invalid file type. Allowed: ${allowed.join(', ')}` }, { status: 400 });
    }

    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not create signed URL' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl,
    });
  }

  // ── Mode 2: proxy (FormData, for small files only) ─────────────────────────
  if (ct.includes('multipart/form-data')) {
    let formData: FormData;
    try { formData = await req.formData(); } catch {
      return NextResponse.json({ error: 'Could not parse form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'audio';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!ALLOWED_BUCKETS.includes(bucket as 'audio' | 'images')) {
      return NextResponse.json({ error: `Invalid bucket` }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowed = bucket === 'audio' ? ALLOWED_AUDIO_EXTS : ALLOWED_IMAGE_EXTS;
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Invalid file type` }, { status: 400 });
    }

    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: publicUrl, path: data.path });
  }

  return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 });
}
