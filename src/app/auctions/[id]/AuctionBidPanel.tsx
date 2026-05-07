'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface BidEntry {
  id:         string
  amount_gbp: number
  placed_at:  string
  bidder:     { display_name: string } | null
}

interface Props {
  auctionId:        string
  initialCurrentBid: number | null
  initialReserve:   number
  initialBidCount:  number
  isLive:           boolean
  isPrivate:        boolean
  isSeller:         boolean
  closesAt:         string
  status:           string
}

export function AuctionBidPanel({
  auctionId, initialCurrentBid, initialReserve,
  initialBidCount, isLive, isPrivate, isSeller, closesAt, status,
}: Props) {
  const [currentBid, setCurrentBid] = useState<number | null>(initialCurrentBid)
  const [bidCount,   setBidCount]   = useState(initialBidCount)
  const [bids,       setBids]       = useState<BidEntry[]>([])
  const [amount,     setAmount]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)
  const [timeLeft,   setTimeLeft]   = useState('')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Fetch bid history
    supabase
      .from('bids')
      .select('id, amount_gbp, placed_at, bidder:profiles!bidder_id(display_name)')
      .eq('auction_id', auctionId)
      .order('placed_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setBids(data as unknown as BidEntry[]) })

    const ch = supabase
      .channel(`auction-room:${auctionId}`)
      // Auction row updates (current bid + count)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        payload => {
          const d = payload.new as any
          if (d.current_bid_gbp !== undefined) setCurrentBid(d.current_bid_gbp)
          if (d.bid_count       !== undefined) setBidCount(d.bid_count)
        },
      )
      // New bid inserts
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        async payload => {
          const b = payload.new as any
          // Fetch the bidder name for the new row
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', b.bidder_id)
            .single()
          const entry: BidEntry = {
            id:         b.id,
            amount_gbp: b.amount_gbp,
            placed_at:  b.placed_at,
            bidder:     profile ?? null,
          }
          setBids(prev => [entry, ...prev])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [auctionId])

  // Countdown timer
  useEffect(() => {
    function tick() {
      const diff = new Date(closesAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  const displayBid = currentBid ?? initialReserve
  // Round suggested bid up to nearest £50
  const suggested = Math.ceil(((currentBid ?? initialReserve) + 50) / 50) * 50

  async function placeBid() {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    setLoading(true); setError(null); setSuccess(false)
    try {
      const res  = await fetch('/api/bids', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ auction_id: auctionId, amount_gbp: amt }),
      })
      const data = await res.json()
      if (res.ok) { setSuccess(true); setAmount('') }
      else        setError(data.error ?? 'Bid failed')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '24px' }}>

      {isPrivate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', background: '#1a1933', border: '0.5px solid var(--purple)', borderRadius: '8px', padding: '8px 12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--purple)' }}>Private auction — invited</span>
        </div>
      )}

      {isLive && (
        <div style={{ background: '#1a0808', border: '0.5px solid var(--red)', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)' }} className='animate-pulse' />
          <span style={{ color: 'var(--red)', fontSize: '12px', fontWeight: 500 }}>Live — {timeLeft} remaining</span>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
          {currentBid ? 'Current bid' : 'Starting reserve'}
        </div>
        <div style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 600 }}>
          GBP {Number(displayBid).toLocaleString()}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{bidCount} bid{bidCount !== 1 ? 's' : ''}</div>
      </div>

      {/* Bid history */}
      {bids.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>Bid history</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
            {bids.map((b, i) => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: '8px',
                background: i === 0 ? '#1a1933' : 'var(--bg-secondary)',
                border: `0.5px solid ${i === 0 ? 'var(--purple)' : 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, flexShrink: 0 }}>
                    {b.bidder?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                  <span style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '12px' }}>
                    {b.bidder?.display_name ?? 'Anonymous'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: i === 0 ? 'var(--purple)' : 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                    GBP {Number(b.amount_gbp).toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    {new Date(b.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLive && !isSeller && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '2px 4px 2px 12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', flexShrink: 0 }}>GBP</span>
            <input
              type='number'
              value={amount}
              onChange={e => { setAmount(e.target.value); setSuccess(false); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && placeBid()}
              placeholder={suggested.toLocaleString()}
              min={suggested}
              step='50'
              disabled={loading}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '15px', padding: '10px 8px' }}
            />
          </div>
          <button
            onClick={placeBid}
            disabled={loading}
            style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Placing…' : 'Place bid'}
          </button>
          {error   && <span style={{ color: 'var(--red)',   fontSize: '12px' }}>{error}</span>}
          {success && <span style={{ color: '#1D9E75', fontSize: '12px' }}>Bid placed successfully</span>}
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
            Min next bid: GBP {suggested.toLocaleString()}
          </p>
        </div>
      )}

      {!isLive && (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
          {status === 'sold' ? 'Auction ended' : status === 'scheduled' ? 'Auction not yet open' : 'Auction ended'}
        </p>
      )}

    </div>
  )
}
