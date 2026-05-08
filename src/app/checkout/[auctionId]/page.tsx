import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { CheckoutClient } from './CheckoutClient'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const BUYER_PREMIUM_PCT = 20
const COMMISSION_PCT    = 10

interface Props { params: Promise<{ auctionId: string }> }

export default async function CheckoutPage({ params }: Props) {
  const { auctionId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth?redirect=/checkout/${auctionId}`)

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) redirect('/onboarding')

  const admin = createServiceClient()

  const { data: auction } = await admin
    .from('auctions')
    .select('id, status, closes_at, current_bid_gbp, seller_id, artwork:artworks(id, title, image_urls)')
    .eq('id', auctionId)
    .single()

  if (!auction) notFound()

  const a = auction as any

  if (a.status === 'settled') {
    return <ErrorPage message='This auction has already been paid.' />
  }
  if (!a.current_bid_gbp) {
    return <ErrorPage message='This auction has no bids.' />
  }

  // Verify winning bidder
  const { data: winningBid } = await admin
    .from('bids')
    .select('bidder_id')
    .eq('auction_id', auctionId)
    .eq('is_winning', true)
    .single()

  if (!winningBid || (winningBid as any).bidder_id !== (profile as any).id) {
    return <ErrorPage message='You are not the winning bidder for this auction.' />
  }

  // Get or create payment intent
  let clientSecret: string
  let amountPence: number

  const { data: existingTxn } = await admin
    .from('transactions')
    .select('stripe_payment_id')
    .eq('auction_id', auctionId)
    .maybeSingle()

  if (existingTxn) {
    const intent = await stripe.paymentIntents.retrieve((existingTxn as any).stripe_payment_id)
    if (intent.status === 'succeeded') {
      return <ErrorPage message='This auction has already been paid.' />
    }
    clientSecret = intent.client_secret!
    amountPence  = intent.amount
  } else {
    const buyer_premium = Math.round(a.current_bid_gbp * (BUYER_PREMIUM_PCT / 100) * 100) / 100
    const total         = Math.round((a.current_bid_gbp + buyer_premium) * 100) / 100
    amountPence         = Math.round(total * 100)

    const intent = await stripe.paymentIntents.create({
      amount:   amountPence,
      currency: 'gbp',
      metadata: {
        auction_id:        auctionId,
        artwork_id:        a.artwork?.id ?? '',
        buyer_id:          (profile as any).id,
        seller_id:         a.seller_id,
        sale_price_gbp:    String(a.current_bid_gbp),
        commission_pct:    String(COMMISSION_PCT),
        buyer_premium_gbp: String(buyer_premium),
      },
    })
    clientSecret = intent.client_secret!
  }

  const hammer      = a.current_bid_gbp
  const buyerPrem   = Math.round(hammer * (BUYER_PREMIUM_PCT / 100) * 100) / 100
  const breakdown   = { hammer_price: hammer, buyer_premium: buyerPrem, total: Math.round((hammer + buyerPrem) * 100) / 100 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-4xl mx-auto px-6 py-10'>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 500 }}>Complete purchase</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            You won the auction for <strong style={{ color: 'var(--text-secondary)' }}>{a.artwork?.title}</strong>
          </p>
        </div>
        <CheckoutClient
          clientSecret={clientSecret}
          auctionId={auctionId}
          artwork={a.artwork}
          breakdown={breakdown}
        />
      </div>
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '40px 32px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Unable to checkout</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>{message}</p>
          <a href='/dashboard' style={{ display: 'inline-block', marginTop: '24px', padding: '9px 20px', background: 'var(--purple)', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
