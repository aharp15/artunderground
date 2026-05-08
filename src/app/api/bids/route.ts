import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PlaceBidSchema = z.object({
  auction_id: z.string().uuid(),
  amount_gbp: z.number().positive().multipleOf(0.01),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PlaceBidSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })

  // Capture current winning bidder before placing bid
  const { data: prevWinner } = await supabase
    .from('bids')
    .select('bidder_id, amount_gbp')
    .eq('auction_id', parsed.data.auction_id)
    .eq('is_winning', true)
    .maybeSingle()

  const { data: result, error } = await supabase.rpc('place_bid', {
    p_auction_id: parsed.data.auction_id,
    p_amount_gbp: parsed.data.amount_gbp,
  })

  if (error) return NextResponse.json({ error: 'Bid placement failed' }, { status: 500 })

  if (!result.ok) {
    const msgs: Record<string, string> = {
      not_authenticated: 'Please sign in to bid',
      auction_not_found: 'Auction not found',
      auction_not_live:  'This auction is not currently accepting bids',
      seller_cannot_bid: 'You cannot bid on your own work',
    }
    const msg = result.error === 'bid_too_low'
      ? ('Minimum bid is GBP ' + result.minimum_bid?.toLocaleString())
      : (msgs[result.error ?? ''] ?? 'Bid rejected')
    return NextResponse.json({ error: msg, code: result.error, minimum_bid: result.minimum_bid }, { status: 422 })
  }

  // Notify the outbid bidder
  if (prevWinner?.bidder_id) {
    const { data: newBidder } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()

    if (newBidder && prevWinner.bidder_id !== (newBidder as any).id) {
      const admin = createServiceClient()
      await admin.from('notifications').insert({
        user_id: prevWinner.bidder_id,
        type:    'outbid',
        payload: {
          auction_id:    parsed.data.auction_id,
          new_bid:       parsed.data.amount_gbp,
          your_bid:      prevWinner.amount_gbp,
        },
      })
    }
  }

  return NextResponse.json({ bid_id: result.bid_id, amount: result.amount })
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const auctionId = searchParams.get('auction_id')
  if (!auctionId) return NextResponse.json({ error: 'auction_id required' }, { status: 400 })
  const { data: bids, error } = await supabase
    .from('bids').select('id, amount_gbp, placed_at, is_winning')
    .eq('auction_id', auctionId).order('placed_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Failed to fetch bids' }, { status: 500 })
  return NextResponse.json({ bids })
}
