import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const BUYER_PREMIUM_PCT = 20
const COMMISSION_PCT    = 10

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { auction_id } = await request.json()
    if (!auction_id) return NextResponse.json({ error: 'auction_id required' }, { status: 400 })

    const admin = createServiceClient()

    // Fetch auction with artwork + seller
    const { data: auction } = await admin
      .from('auctions')
      .select('id, status, closes_at, current_bid_gbp, seller_id, artwork:artworks(id, title, image_urls)')
      .eq('id', auction_id)
      .single()

    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

    const a = auction as any
    const now = new Date()

    if (new Date(a.closes_at) > now && a.status === 'live') {
      return NextResponse.json({ error: 'Auction is still live' }, { status: 422 })
    }
    if (a.status === 'settled') {
      return NextResponse.json({ error: 'Already paid' }, { status: 422 })
    }
    if (!a.current_bid_gbp) {
      return NextResponse.json({ error: 'No bids on this auction' }, { status: 422 })
    }

    // Verify the caller is the winning bidder
    const { data: winningBid } = await admin
      .from('bids')
      .select('id, bidder_id, amount_gbp')
      .eq('auction_id', auction_id)
      .eq('is_winning', true)
      .single()

    if (!winningBid) return NextResponse.json({ error: 'No winning bid found' }, { status: 404 })
    if ((winningBid as any).bidder_id !== (profile as any).id) {
      return NextResponse.json({ error: 'You are not the winning bidder' }, { status: 403 })
    }

    // Prevent duplicate payment intents
    const { data: existingTxn } = await admin
      .from('transactions')
      .select('id, stripe_payment_id')
      .eq('auction_id', auction_id)
      .maybeSingle()

    if (existingTxn) {
      // Return existing intent's client_secret
      const intent = await stripe.paymentIntents.retrieve((existingTxn as any).stripe_payment_id)
      if (intent.status === 'succeeded') {
        return NextResponse.json({ error: 'Already paid' }, { status: 422 })
      }
      return NextResponse.json({ client_secret: intent.client_secret, amount_pence: intent.amount, breakdown: buildBreakdown(a.current_bid_gbp) })
    }

    const breakdown = buildBreakdown(a.current_bid_gbp)

    // Fetch seller's Stripe Connect account if they have one
    const { data: seller } = await admin
      .from('profiles').select('stripe_account_id').eq('id', a.seller_id).single()
    const sellerAccountId = (seller as any)?.stripe_account_id as string | null

    const commissionGbp    = Math.round(a.current_bid_gbp * (COMMISSION_PCT / 100) * 100) / 100
    const appFeePence      = Math.round((breakdown.buyer_premium + commissionGbp) * 100)

    const intentParams: any = {
      amount:   breakdown.total_pence,
      currency: 'gbp',
      metadata: {
        auction_id:        auction_id,
        artwork_id:        a.artwork?.id ?? '',
        buyer_id:          (profile as any).id,
        seller_id:         a.seller_id,
        sale_price_gbp:    String(a.current_bid_gbp),
        commission_pct:    String(COMMISSION_PCT),
        buyer_premium_gbp: String(breakdown.buyer_premium),
      },
    }

    // Route funds to seller via Connect if they've onboarded
    if (sellerAccountId) {
      intentParams.application_fee_amount = appFeePence
      intentParams.transfer_data = { destination: sellerAccountId }
    }

    const intent = await stripe.paymentIntents.create(intentParams)

    return NextResponse.json({ client_secret: intent.client_secret, amount_pence: intent.amount, breakdown })

  } catch (err: any) {
    console.error('checkout POST error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildBreakdown(hammerPrice: number) {
  const buyer_premium = Math.round(hammerPrice * (BUYER_PREMIUM_PCT / 100) * 100) / 100
  const total         = Math.round((hammerPrice + buyer_premium) * 100) / 100
  return {
    hammer_price:  hammerPrice,
    buyer_premium,
    total,
    total_pence:   Math.round(total * 100),
  }
}
