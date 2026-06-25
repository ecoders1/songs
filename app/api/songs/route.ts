import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  return NextResponse.json({ songs: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const body = await req.json();
  const { title, artist_id, audio_url, lyrics, image_url, track_number, category, language, duration } = body;

  if (!title || !artist_id || !audio_url) {
    return NextResponse.json({ error: 'title, artist_id, and audio_url are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('songs')
    .insert({ title, artist_id, audio_url, lyrics, image_url, track_number: track_number ?? 1, category: category ?? 'new', language: language ?? 'oromo', duration })
    .select('*, artist:artists(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data }, { status: 201 });
}
