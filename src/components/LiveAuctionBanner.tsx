'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  auction: {
    id: string
    closes_at: string
    bid_count: number
    current_bid_gbp: number | null
    reserve_gbp: number
    artwork: { id: string; title: string; image_urls: string[] } | null
    seller: { display_name: string } | null
  }
}

export function LiveAuctionBanner({ auction }: Props) {
  const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' })

  useEffect(() => {
    function tick() {
      const diff = new Date(auction.closes_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ h: '00', m: '00', s: '00' }); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [auction.closes_at])

  return (
    <div style={{ background: '#26215C', borderRadius: '12px', padding: '16px 22px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
          Live auction — {auction.artwork?.title ?? 'Untitled'}
        </h3>
        <p style={{ color: '#AFA9EC', fontSize: '12px', marginTop: '3px' }}>
          {auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''} · by {auction.seller?.display_name ?? 'Artist'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '14px' }}>
        {[
          { val: timeLeft.h, label: 'hrs' },
          { val: timeLeft.m, label: 'min' },
          { val: timeLeft.s, label: 'sec' },
        ].map(({ val, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
            <div style={{ fontSize: '10px', color: '#7F77DD' }}>{label}</div>
          </div>
        ))}
      </div>

      <Link href={'/artworks/' + auction.artwork?.id}
        style={{ background: 'var(--purple)', color: '#fff', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
        Join auction
      </Link>
    </div>
  )
}
