import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const InviteSchema = z.object({
  invitee_id: z.string().uuid(),
})

const UpdateInviteSchema = z.object({
  invite_id: z.string().uuid(),
  status:    z.enum(['accepted', 'declined']),
})

type RouteParams = { params: Promise<{ id: string }> }

async function getProfileAndVerifySeller(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  auctionId: string
) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { profile: null, auction: null, error: 'unauthorized' }

  const { data: profile } = await supabase
    .from('profiles').select('id, display_name').eq('auth_user_id', user.id).single()
  if (!profile) return { profile: null, auction: null, error: 'no_profile' }

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, seller_id, visibility, artwork_id, artwork:artworks(title)')
    .eq('id', auctionId)
    .single()
  if (!auction) return { profile, auction: null, error: 'no_auction' }

  return { profile, auction, error: null }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { profile, auction, error } = await getProfileAndVerifySeller(supabase, auctionId)
    if (error === 'unauthorized' || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error === 'no_auction' || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }
    if ((auction as any).seller_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: invites, error: inviteError } = await supabase
      .from('auction_invites')
      .select(`
        id, invitee_id, invited_by, status, created_at,
        invitee:profiles!invitee_id(id, display_name, avatar_url)
      `)
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('Invites fetch error:', inviteError.message)
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    return NextResponse.json({ invites: invites ?? [] })

  } catch (err: any) {
    console.error('Invites GET error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { profile, auction, error } = await getProfileAndVerifySeller(supabase, auctionId)
    if (error === 'unauthorized' || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error === 'no_auction' || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }
    if ((auction as any).seller_id !== profile.id) {
      return NextResponse.json({ error: 'Only the auction seller can invite' }, { status: 403 })
    }

    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

    const parsed = InviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { data: invite, error: inviteError } = await supabase
      .from('auction_invites')
      .insert({
        auction_id: auctionId,
        invitee_id: parsed.data.invitee_id,
        invited_by: profile.id,
      })
      .select()
      .single()

    if (inviteError) {
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: 'Already invited' }, { status: 409 })
      }
      console.error('Invite insert error:', inviteError.message)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    const auctionTitle = (auction as any).artwork?.title ?? 'Untitled'
    await supabase.from('notifications').insert({
      user_id: parsed.data.invitee_id,
      type:    'auction_invite',
      payload: {
        auction_id:    auctionId,
        invite_id:     invite.id,
        auction_title: auctionTitle,
        seller_name:   profile.display_name,
      },
    })

    return NextResponse.json({ invite }, { status: 201 })

  } catch (err: any) {
    console.error('Invites POST error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

    const parsed = UpdateInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { data: invite, error: inviteError } = await supabase
      .from('auction_invites')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.invite_id)
      .eq('auction_id', auctionId)
      .eq('invitee_id', profile.id)
      .select()
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found or not authorized' }, { status: 404 })
    }

    return NextResponse.json({ invite })

  } catch (err: any) {
    console.error('Invites PATCH error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
