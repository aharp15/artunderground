'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

// dynamic + ssr:false must live inside a 'use client' file in Next.js 16
const Stream   = dynamic(() => import('./AuctionStream').then(m => ({ default: m.AuctionStream })),     { ssr: false })
const BidPanel = dynamic(() => import('./AuctionBidPanel').then(m => ({ default: m.AuctionBidPanel })), { ssr: false })

type StreamProps   = ComponentProps<typeof Stream>
type BidPanelProps = ComponentProps<typeof BidPanel>

export function AuctionStreamClient(props: StreamProps)   { return <Stream   {...props} /> }
export function AuctionBidClient(props: BidPanelProps)    { return <BidPanel {...props} /> }
