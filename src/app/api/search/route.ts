import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ artists: [], artworks: [] })

  const supabase = await createServerSupabaseClient()
  const pattern = `%${q}%`

  const [artistsRes, artworksRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, bio, location, avatar_url, roles')
      .ilike('display_name', pattern)
      .contains('roles', ['artist'])
      .limit(8),
    supabase
      .from('artworks')
      .select('id, title, medium, price_gbp, image_urls, status, artist:profiles(id, display_name)')
      .ilike('title', pattern)
      .in('status', ['available', 'auctioned'])
      .limit(12),
  ])

  return NextResponse.json({
    artists: artistsRes.data ?? [],
    artworks: artworksRes.data ?? [],
  })
}
