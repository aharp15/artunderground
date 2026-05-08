import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  let opened = 0
  let closed = 0

  // ── Open scheduled auctions that have reached opens_at ──────────────────
  const { data: toOpen } = await admin
    .from('auctions')
    .select('id')
    .eq('status', 'scheduled')
    .lte('opens_at', new Date().toISOString())

  if (toOpen?.length) {
    const { error } = await admin
      .from('auctions')
      .update({ status: 'live' })
      .in('id', toOpen.map((a: any) => a.id))
    if (!error) opened = toOpen.length
  }

  // ── Close live auctions that have passed closes_at ───────────────────────
  const { data: expired } = await admin
    .from('auctions')
    .select('id, seller_id')
    .eq('status', 'live')
    .lte('closes_at', new Date().toISOString())

  if (!expired?.length) return NextResponse.json({ opened, closed })

  for (const auction of expired) {
    const { error } = await admin
      .from('auctions')
      .update({ status: 'ended' })
      .eq('id', auction.id)

    if (error) continue
    closed++

    const { data: winning } = await admin
      .from('bids')
      .select('bidder_id, amount_gbp')
      .eq('auction_id', auction.id)
      .eq('is_winning', true)
      .maybeSingle()

    if (winning) {
      await admin.from('notifications').insert([
        {
          user_id: (winning as any).bidder_id,
          type:    'auction_won',
          payload: { auction_id: auction.id, amount_gbp: (winning as any).amount_gbp },
        },
        {
          user_id: auction.seller_id,
          type:    'auction_ended_sold',
          payload: { auction_id: auction.id, winning_bid: (winning as any).amount_gbp, winner_id: (winning as any).bidder_id },
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

  return NextResponse.json({ opened, closed })
}
