'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Auction, Bid } from '@/lib/types'

interface PlaceBidResult { ok: boolean; error?: string; minimum_bid?: number }

export function useAuction(auctionId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [auction, setAuction]   = useState<Auction | null>(null)
  const [bids, setBids]         = useState<Bid[]>([])
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    if (!auctionId) { setLoading(false); return }
    async function load() {
      const [{ data: auctionData }, { data: bidsData }] = await Promise.all([
        supabase.from('auctions').select('*').eq('id', auctionId).single(),
        supabase.from('bids').select('id, amount_gbp, placed_at, is_winning').eq('auction_id', auctionId).order('placed_at', { ascending: false }).limit(50),
      ])
      setAuction(auctionData); setBids(bidsData ?? []); setLoading(false)
    }
    load()
  }, [auctionId, supabase])

  useEffect(() => {
    if (!auctionId) return
    const channel = supabase
      .channel('auction-' + auctionId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: 'id=eq.' + auctionId },
        (payload) => setAuction(payload.new as Auction))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids', filter: 'auction_id=eq.' + auctionId },
        (payload) => setBids(prev => [payload.new as Bid, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [auctionId, supabase])

  const placeBid = useCallback(async (amount: number): Promise<PlaceBidResult> => {
    const res = await fetch('/api/bids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auction_id: auctionId, amount_gbp: amount }) })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error, minimum_bid: data.minimum_bid }
    return { ok: true }
  }, [auctionId])

  return { auction, bids, isLoading, placeBid }
}
