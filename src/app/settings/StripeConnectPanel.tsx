'use client'

import { useState, useEffect } from 'react'

interface Props {
  stripeAccountId: string | null
  justConnected:   boolean
  needsRefresh:    boolean
}

export function StripeConnectPanel({ stripeAccountId, justConnected, needsRefresh }: Props) {
  const [status,    setStatus]    = useState<'loading' | 'connected' | 'pending' | 'none'>('loading')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!stripeAccountId) { setStatus('none'); return }
    fetch('/api/stripe/connect').then(r => r.json()).then(d => {
      setStatus(d.connected ? 'connected' : 'pending')
    }).catch(() => setStatus('none'))
  }, [stripeAccountId])

  async function handleConnect() {
    setConnecting(true)
    const res  = await fetch('/api/stripe/connect', { method: 'POST' })
    const data = await res.json()
    if (data.already_connected) { setStatus('connected'); setConnecting(false); return }
    if (data.url) window.location.href = data.url
    else setConnecting(false)
  }

  return (
    <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      className='border rounded-xl p-5'>
      <div className='flex items-center justify-between mb-1'>
        <h2 style={{ color: 'var(--text-primary)' }} className='font-medium text-sm'>Stripe payouts</h2>
        {status === 'connected' && (
          <span style={{ background: '#0a1f18', borderColor: '#1D9E75', color: '#1D9E75' }}
            className='text-xs border rounded-full px-2.5 py-0.5'>Connected</span>
        )}
        {status === 'pending' && (
          <span style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            className='text-xs border rounded-full px-2.5 py-0.5'>Incomplete</span>
        )}
      </div>

      {justConnected && status !== 'loading' && (
        <p style={{ color: '#1D9E75' }} className='text-xs mb-3'>
          Stripe account connected — you'll receive payouts automatically when your works sell.
        </p>
      )}

      {status === 'none' && (
        <>
          <p style={{ color: 'var(--text-muted)' }} className='text-xs mb-3'>
            Connect a Stripe account to receive payouts when your works sell at auction.
          </p>
          <button onClick={handleConnect} disabled={connecting}
            style={{ background: '#635BFF', fontSize: '13px' }}
            className='text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2'>
            {connecting ? 'Redirecting…' : 'Connect Stripe'}
          </button>
        </>
      )}

      {status === 'pending' && (
        <>
          <p style={{ color: 'var(--text-muted)' }} className='text-xs mb-3'>
            {needsRefresh
              ? 'Your onboarding link expired. Start again below.'
              : 'Finish setting up your Stripe account to receive payouts.'}
          </p>
          <button onClick={handleConnect} disabled={connecting}
            style={{ background: '#635BFF', fontSize: '13px' }}
            className='text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50'>
            {connecting ? 'Redirecting…' : 'Complete setup'}
          </button>
        </>
      )}

      {status === 'connected' && !justConnected && (
        <p style={{ color: 'var(--text-muted)' }} className='text-xs'>
          Payouts are active. Funds transfer automatically after each sale.
        </p>
      )}
    </div>
  )
}
