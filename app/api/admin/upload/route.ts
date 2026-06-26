import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth';

const ALLOWED_BUCKETS = ['audio', 'images'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureBucketExists(supabase: SupabaseClient<any>, bucket: string) {
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Failed to list buckets: ${listError.message}`);

  const exists = buckets?.some((b: { name: string }) => b.name === bucket);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: bucket === 'audio'
        ? ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac']
        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
      fileSizeLimit: bucket === 'audio' ? 52428800 : 10485760, // 50MB audio, 10MB images
    });
    if (createError) throw new Error(`Failed to create bucket "${bucket}": ${createError.message}`);
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const bucket = (formData.get('bucket') as string) || 'audio';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: `Invalid bucket. Allowed: ${ALLOWED_BUCKETS.join(', ')}` }, { status: 400 });
  }

  try {
    // Auto-create bucket if it doesn't exist
    await ensureBucketExists(supabase, bucket);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Bucket setup failed' }, { status: 500 });
  }

  const ALLOWED_AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
  const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const allowedExts = bucket === 'audio' ? ALLOWED_AUDIO_EXTS : ALLOWED_IMAGE_EXTS;

  if (!ext || !allowedExts.includes(ext)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed for ${bucket}: ${allowedExts.join(', ')}` },
      { status: 400 }
    );
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl, path: data.path });
}
