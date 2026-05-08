'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Price } from '@/components/Price'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Breakdown {
  hammer_price:  number
  buyer_premium: number
  total:         number
}

function PayForm({ auctionId }: { auctionId: string }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) { setError(submitErr.message ?? 'Form error'); setLoading(false); return }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/${auctionId}/success`,
      },
    })

    if (confirmErr) {
      setError(confirmErr.message ?? 'Payment failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PaymentElement />
      {error && (
        <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>
      )}
      <button
        type='submit'
        disabled={!stripe || loading}
        style={{
          background: loading ? 'var(--bg-hover)' : 'var(--purple)',
          color: 'white', border: 'none', borderRadius: '10px',
          padding: '14px', fontSize: '15px', fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Processing…' : 'Confirm payment'}
      </button>
    </form>
  )
}

interface Props {
  clientSecret: string
  auctionId:    string
  artwork:      { title: string; image_urls: string[] | null }
  breakdown:    Breakdown
}

export function CheckoutClient({ clientSecret, auctionId, artwork, breakdown }: Props) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#7C6AF5', borderRadius: '8px' } } }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>

        {/* Left: order summary */}
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 500, marginBottom: '20px' }}>Order summary</h2>

          {/* Artwork */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              {artwork.image_urls?.[0]
                ? <img src={artwork.image_urls[0]} alt={artwork.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--bg-hover)' }} />}
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>{artwork.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>Auction lot</div>
            </div>
          </div>

          {/* Price breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Hammer price',         value: breakdown.hammer_price },
              { label: "Buyer's premium (20%)", value: breakdown.buyer_premium },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{row.label}</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}><Price gbp={row.value} /></span>
              </div>
            ))}
            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>Total due</span>
              <span style={{ color: 'var(--purple)', fontSize: '16px', fontWeight: 700 }}>
                <Price gbp={breakdown.total} />
              </span>
            </div>
          </div>
        </div>

        {/* Right: payment form */}
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 500, marginBottom: '20px' }}>Payment details</h2>
          <PayForm auctionId={auctionId} />
        </div>

      </div>
    </Elements>
  )
}
