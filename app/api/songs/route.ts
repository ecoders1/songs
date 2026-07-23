import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/auth';

function getAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist_id = searchParams.get('artist_id');
  const category = searchParams.get('category');
  const language = searchParams.get('language');
  const search = searchParams.get('search');

  const supabase = getAnonSupabase();
  let query = supabase
    .from('songs')
    .select('*, artist:artists(*)')
    .order('track_number');

  if (artist_id) query = query.eq('artist_id', artist_id);
  if (category) query = query.eq('category', category);
  if (language) query = query.eq('language', language);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cache at CDN/browser for 5 minutes — prevents hammering Supabase on every navigation
  return NextResponse.json({ songs: data || [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized — please log in again' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, artist_id, audio_url, lyrics, image_url, track_number, category, language, duration } = body;

  if (!title || !artist_id || !audio_url) {
    return NextResponse.json({ error: 'title, artist_id, and audio_url are required' }, { status: 400 });
  }

  // Validate enums
  const validCategories = ['new', 'old', 'single', 'group'];
  const validLanguages = ['oromo', 'english', 'amharic', 'sidama', 'arabic'];
  if (category && !validCategories.includes(category as string)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (language && !validLanguages.includes(language as string)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('songs')
    .insert({
      title, artist_id, audio_url, lyrics, image_url,
      track_number: track_number ?? 1,
      category: category ?? 'new',
      language: language ?? 'oromo',
      duration,
    })
    .select('*, artist:artists(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data }, { status: 201 });
}
