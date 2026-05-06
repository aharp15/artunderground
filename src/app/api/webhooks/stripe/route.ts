import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  let event: Stripe.Event
  try { event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!) }
  catch (err) { console.error(err); return NextResponse.json({ error: 'Invalid signature' }, { status: 400 }) }
  const supabase = createServiceClient()
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const { artwork_id, auction_id, buyer_id, seller_id, sale_price_gbp, commission_pct, buyer_premium_gbp } = intent.metadata
    const salePrice  = parseFloat(sale_price_gbp)
    const commission = salePrice * (parseFloat(commission_pct) / 100)
    await supabase.from('transactions').insert({ artwork_id, buyer_id, seller_id, auction_id: auction_id || null, sale_price_gbp: salePrice, commission_gbp: commission, buyer_premium_gbp: parseFloat(buyer_premium_gbp ?? '0'), stripe_payment_id: intent.id, status: 'completed', completed_at: new Date().toISOString() })
    await supabase.from('artworks').update({ status: 'sold' }).eq('id', artwork_id)
    const { data: aw } = await supabase.from('artworks').select('provenance').eq('id', artwork_id).single()
    if (aw) await supabase.from('artworks').update({ provenance: [...(aw.provenance as object[]), { type: 'sold', description: 'Sold via ArtUNDERGROUND', date: new Date().toISOString().split('T')[0] }] }).eq('id', artwork_id)
    if (auction_id) await supabase.from('auctions').update({ status: 'settled' }).eq('id', auction_id)
    await supabase.from('notifications').insert({ user_id: seller_id, type: 'work_featured', payload: { artwork_id, sale_price: salePrice, your_payout: salePrice - commission } })
  }
  return NextResponse.json({ received: true })
}

export const config = { api: { bodyParser: false } }
