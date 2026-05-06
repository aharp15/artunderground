import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateArtworkSchema = z.object({
  title: z.string().min(1).max(200),
  medium: z.string().max(100).optional(),
  dimensions: z.string().max(100).optional(),
  year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  price_gbp: z.number().positive().optional(),
  image_urls: z.array(z.string().url()).min(1).max(10),
  status: z.enum(['draft', 'listed']).default('draft'),
})

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const artistId = searchParams.get('artist_id')
  const status   = searchParams.get('status')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '24'), 100)
  const offset   = parseInt(searchParams.get('offset') ?? '0')
  let query = supabase.from('artworks')
    .select('*, artist:profiles(id, display_name, avatar_url, location), auction:auctions(id, current_bid_gbp, bid_count, closes_at, status)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (!artistId) query = query.in('status', ['listed', 'in_auction', 'sold'])
  if (artistId)  query = query.eq('artist_id', artistId)
  if (status)    query = query.eq('status', status)
  const { data: artworks, error, count } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch artworks' }, { status: 500 })
  return NextResponse.json({ artworks, count })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('id, roles').eq('auth_user_id', user.id).single()
  if (!profile || !profile.roles.includes('artist')) return NextResponse.json({ error: 'Only artists can list artworks' }, { status: 403 })
  const body = await request.json()
  const parsed = CreateArtworkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  const today = new Date().toISOString().split('T')[0]
  const provenance = [
    { type: 'created', description: 'Work created by artist', date: today },
    ...(parsed.data.status === 'listed' ? [{ type: 'listed', description: 'Listed on ArtUNDERGROUND', date: today }] : [])
  ]
  const { data: artwork, error } = await supabase.from('artworks').insert({ artist_id: profile.id, ...parsed.data, provenance }).select().single()
  if (error) return NextResponse.json({ error: 'Failed to create artwork' }, { status: 500 })
  return NextResponse.json({ artwork }, { status: 201 })
}
