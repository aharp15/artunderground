import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Called by Vercel Cron (vercel.json) or manually with the CRON_SECRET header.
// Also acts as a fallback if pg_cron is not available.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()

  // Find all live auctions that have expired
  const { data: expired } = await admin
    .from('auctions')
    .select('id, seller_id')
    .eq('status', 'live')
    .lte('closes_at', new Date().toISOString())

  if (!expired?.length) return NextResponse.json({ closed: 0 })

  let closed = 0

  for (const auction of expired) {
    const { error } = await admin
      .from('auctions')
      .update({ status: 'ended' })
      .eq('id', auction.id)

    if (error) continue
    closed++

    // Find winning bid
    const { data: winning } = await admin
      .from('bids')
      .select('bidder_id, amount_gbp')
      .eq('auction_id', auction.id)
      .eq('is_winning', true)
      .maybeSingle()

    if (winning) {
      await admin.from('notifications').insert([
        {
          user_id: winning.bidder_id,
          type:    'auction_won',
          payload: { auction_id: auction.id, amount_gbp: winning.amount_gbp },
        },
        {
          user_id: auction.seller_id,
          type:    'auction_ended_sold',
          payload: { auction_id: auction.id, winning_bid: winning.amount_gbp, winner_id: winning.bidder_id },
        },
      ])
    } else {
      await admin.from('notifications').insert({
        user_id: auction.seller_id,
        type:    'auction_ended_unsold',
        payload: { auction_id: auction.id },
      })
    }
  }

  return NextResponse.json({ closed })
}
