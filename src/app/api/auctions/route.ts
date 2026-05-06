import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateAuctionSchema = z.object({
  artwork_id:  z.string().uuid(),
  reserve_gbp: z.number().positive(),
  opens_at:    z.string().min(1),
  closes_at:   z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id, roles').eq('auth_user_id', user.id).single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (!profile.roles.includes('artist')) {
      return NextResponse.json({ error: 'Only artists can create auctions' }, { status: 403 })
    }

    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

    const parsed = CreateAuctionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { artwork_id, reserve_gbp, opens_at, closes_at } = parsed.data

    const { data: artwork, error: artworkError } = await supabase
      .from('artworks').select('id, status, artist_id').eq('id', artwork_id).single()
    if (artworkError || !artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 })
    }
    if (String(artwork.artist_id).trim() !== String(profile.id).trim()) {
      return NextResponse.json({ error: 'You do not own this artwork' }, { status: 403 })
    }
    if (!['listed', 'draft'].includes(artwork.status)) {
      return NextResponse.json({ error: 'Artwork is already in auction or sold' }, { status: 409 })
    }

    const { data: auction, error: aucError } = await supabase
      .from('auctions')
      .insert({
        artwork_id,
        seller_id:   profile.id,
        reserve_gbp,
        opens_at,
        closes_at,
        status: 'live',
      })
      .select()
      .single()

    if (aucError) {
      console.error('Auction insert error:', aucError.message)
      return NextResponse.json(
        { error: 'Failed to create auction' },
        { status: 500 }
      )
    }

    // Update artwork status
    await supabase.from('artworks').update({ status: 'in_auction' }).eq('id', artwork_id)

    // Append provenance — safely handle null or non-array provenance
    const { data: aw } = await supabase
      .from('artworks').select('provenance').eq('id', artwork_id).single()

    if (aw) {
      const existing = Array.isArray(aw.provenance) ? aw.provenance : []
      await supabase.from('artworks').update({
        provenance: [...existing, {
          type: 'listed',
          description: 'Listed for auction on ArtUNDERGROUND',
          date: new Date().toISOString().split('T')[0],
        }]
      }).eq('id', artwork_id)
    }

    return NextResponse.json({ auction }, { status: 201 })

  } catch (err: any) {
    console.error('Auction route error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
