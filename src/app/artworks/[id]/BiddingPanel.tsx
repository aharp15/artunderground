'use client'

import { useState } from 'react'
import { useAuction } from '@/hooks/useAuction'
import type { Auction, Artwork } from '@/lib/types'

interface Props {
  artwork: Artwork & { artist: { display_name: string } }
  initialAuction: Auction | null
}

export function BiddingPanel({ artwork, initialAuction }: Props) {
  const [bidInput, setBidInput] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const { auction, bids, isLoading, placeBid } = useAuction(initialAuction?.id ?? '')
  const live       = auction ?? initialAuction
  const isLive     = live?.status === 'live'
  const currentBid = live?.current_bid_gbp ?? live?.reserve_gbp ?? 0

  async function handleBid() {
    const amount = parseFloat(bidInput)
    if (isNaN(amount)) { setFeedback('Enter a valid amount'); return }
    const result = await placeBid(amount)
    if (result.ok) { setSuccess(true); setBidInput(''); setTimeout(() => setSuccess(false), 5000) }
    else setFeedback(result.error ?? 'Bid failed')
  }

  if (!live) return (
    <div className='p-6'>
      <p className='text-2xl font-medium'>
        {artwork.price_gbp != null ? 'GBP ' + artwork.price_gbp.toLocaleString() : 'POA'}
      </p>
    </div>
  )

  return (
    <div className='p-6 space-y-4'>
      {success && <div className='bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800'>Bid placed - you are the highest bidder.</div>}
      {isLive && <div className='bg-red-950 border border-red-800 rounded-lg px-4 py-2 text-red-300 text-sm font-medium'>Live auction — closes {new Date(live.closes_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
      <div><div className='text-3xl font-medium'>GBP{(live.current_bid_gbp ?? live.reserve_gbp).toLocaleString()}</div><div className='text-sm text-gray-400'>{live.bid_count} bids</div></div>
      {isLive && (
        <div className='flex gap-2'>
          <input type='number' value={bidInput} onChange={e => { setBidInput(e.target.value); setFeedback(null) }}
            placeholder={'Min GBP ' + (currentBid + 50).toLocaleString()}
            className='flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm' />
          <button onClick={handleBid} disabled={isLoading} className='bg-purple-500 text-white px-4 rounded-lg text-sm font-medium'>Bid</button>
        </div>
      )}
      {feedback && <div className='text-sm text-red-600'>{feedback}</div>}
      <div>
        <div className='text-sm font-medium mb-2'>Bid history</div>
        {bids.map((bid, i) => (
          <div key={bid.id} className='flex justify-between py-1.5 text-sm border-b border-gray-50'>
            <span className='text-gray-500'>Collector {i === 0 && <span className='text-green-600 font-medium ml-1'>Highest</span>}</span>
            <span className='font-medium'>GBP{bid.amount_gbp.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
