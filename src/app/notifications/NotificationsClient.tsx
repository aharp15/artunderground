'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Price } from '@/components/Price'

interface Notification {
  id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

const typeLabel: Record<string, string> = {
  new_bid:              'New bid on your work',
  outbid:               'You\'ve been outbid',
  auction_won:          'You won an auction',
  auction_ended_sold:   'Auction ended — sold',
  auction_ended_unsold: 'Auction ended — no bids',
  new_follower:         'New follower',
  work_featured:        'Work featured',
  new_message:          'New message',
  auction_invite:       'Private auction invite',
}

function NotificationRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const p = n.payload
  const label = typeLabel[n.type] ?? n.type.replace(/_/g, ' ')
  const time  = new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

  function content() {
    switch (n.type) {
      case 'outbid':
        return (
          <span>
            Your bid of <Price gbp={p.your_bid as number} /> was beaten —
            new bid is <Price gbp={p.new_bid as number} />.{' '}
            {p.auction_id && <Link href={`/auctions/${p.auction_id}`} style={{ color: 'var(--purple)' }}>View auction →</Link>}
          </span>
        )
      case 'auction_won':
        return (
          <span>
            You won with a bid of <Price gbp={p.amount_gbp as number} />.{' '}
            {p.auction_id && <Link href={`/checkout/${p.auction_id}`} style={{ color: 'var(--purple)' }}>Pay now →</Link>}
          </span>
        )
      case 'auction_ended_sold':
        return (p as any).payment_confirmed
          ? <span>Payment confirmed. Your payout: <Price gbp={p.your_payout as number} /></span>
          : <span>Winning bid: <Price gbp={p.winning_bid as number} /></span>
      case 'auction_ended_unsold':
        return <span>No bids were placed. Consider relisting.</span>
      case 'new_follower':
        return <span>Someone started following you.</span>
      case 'new_message':
        return (
          <span>
            {p.sender_name as string}: {(p.preview as string)?.slice(0, 60)}{' '}
            {p.conversation_id && <Link href={`/messages/${p.conversation_id}`} style={{ color: 'var(--purple)' }}>Open →</Link>}
          </span>
        )
      case 'auction_invite':
        return (
          <span>
            Invited by {p.seller_name as string} to bid on <em>{p.auction_title as string}</em>.{' '}
            {p.auction_id && <Link href={`/auctions/${p.auction_id}`} style={{ color: 'var(--purple)' }}>View →</Link>}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div
      onClick={() => !n.read && onRead(n.id)}
      style={{
        background: n.read ? 'var(--bg-secondary)' : '#16143a',
        borderColor: n.read ? 'var(--border)' : 'var(--purple)',
        cursor: n.read ? 'default' : 'pointer',
      }}
      className='border rounded-lg p-4 flex items-start gap-3 transition-colors'>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
        background: n.read ? 'var(--border)' : 'var(--purple)',
      }} />
      <div className='flex-1 min-w-0'>
        <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>{label}</div>
        <div style={{ color: 'var(--text-secondary)' }} className='text-xs mt-0.5 leading-relaxed'>{content()}</div>
        <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-1.5'>{time}</div>
      </div>
    </div>
  )
}

export function NotificationsClient({ initial }: { initial: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [loading, setLoading]             = useState(false)
  const [hasMore, setHasMore]             = useState(initial.length === 30)

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  }

  async function loadMore() {
    const last = notifications[notifications.length - 1]
    if (!last) return
    setLoading(true)
    const res = await fetch(`/api/notifications?cursor=${encodeURIComponent(last.created_at)}`)
    const { notifications: more } = await res.json()
    setNotifications(prev => [...prev, ...(more ?? [])])
    setHasMore((more ?? []).length === 30)
    setLoading(false)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (notifications.length === 0) {
    return (
      <div className='text-center py-20'>
        <p style={{ color: 'var(--text-muted)' }} className='text-sm'>No notifications yet</p>
      </div>
    )
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className='flex items-center justify-between mb-5'>
          <span style={{ color: 'var(--text-muted)' }} className='text-sm'>{unreadCount} unread</span>
          <button onClick={markAllRead}
            style={{ color: 'var(--purple)', fontSize: '13px' }}
            className='hover:opacity-80 font-medium'>
            Mark all read
          </button>
        </div>
      )}

      <div className='space-y-2'>
        {notifications.map(n => (
          <NotificationRow key={n.id} n={n} onRead={markRead} />
        ))}
      </div>

      {hasMore && (
        <div className='mt-6 text-center'>
          <button onClick={loadMore} disabled={loading}
            style={{ color: 'var(--text-secondary)', fontSize: '13px', borderColor: 'var(--border)' }}
            className='border rounded-lg px-5 py-2 hover:opacity-80 disabled:opacity-50'>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
