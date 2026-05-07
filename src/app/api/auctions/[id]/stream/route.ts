import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { AccessToken } from 'livekit-server-sdk'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id, display_name').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: auction } = await supabase
      .from('auctions').select('id, seller_id, status, visibility').eq('id', auctionId).single()
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

    const a = auction as any
    const isHost = a.seller_id === (profile as any).id

    if (!isHost && a.visibility === 'private') {
      const { data: invite } = await supabase
        .from('auction_invites')
        .select('status')
        .eq('auction_id', auctionId)
        .eq('invitee_id', (profile as any).id)
        .single()
      if (!invite || invite.status !== 'accepted') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const apiKey    = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const lkUrl     = process.env.NEXT_PUBLIC_LIVEKIT_URL

    if (!apiKey || !apiSecret || !lkUrl) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 })
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: (profile as any).id,
      name:     (profile as any).display_name ?? 'Participant',
      ttl:      '4h',
    })

    at.addGrant({
      roomJoin:       true,
      room:           `auction-${auctionId}`,
      canPublish:     isHost,
      canSubscribe:   true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    return NextResponse.json({ token, url: lkUrl, role: isHost ? 'host' : 'viewer' })

  } catch (err: any) {
    console.error('Stream token error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: auction } = await supabase
      .from('auctions').select('seller_id').eq('id', auctionId).single()
    if (!auction || (auction as any).seller_id !== (profile as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const active: boolean = !!body.active

    const update: Record<string, unknown> = { stream_active: active }
    if (active) update.stream_started_at = new Date().toISOString()

    const admin = createServiceClient()
    const { error } = await admin.from('auctions').update(update).eq('id', auctionId)
    if (error) {
      console.error('Stream PATCH error:', error.message)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ stream_active: active })

  } catch (err: any) {
    console.error('Stream PATCH error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
