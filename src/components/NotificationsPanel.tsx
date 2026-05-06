'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export function NotificationsPanel({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [loadingId, setLoadingId]         = useState<string | null>(null)

  async function handleInviteResponse(notification: Notification, status: 'accepted' | 'declined') {
    const { auction_id, invite_id } = notification.payload as Record<string, string>
    setLoadingId(notification.id)

    const res = await fetch(`/api/auctions/${auction_id}/invites`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_id, status }),
    })

    if (res.ok) {
      setNotifications(prev =>
        prev.map(n => n.id === notification.id
          ? { ...n, payload: { ...n.payload, _responded: status } }
          : n
        )
      )
    }
    setLoadingId(null)
  }

  if (notifications.length === 0) return null

  return (
    <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
      <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-4'>Notifications</h2>
      <div className='space-y-3'>
        {notifications.map(n => {
          const p = n.payload as Record<string, unknown>
          const responded = p._responded as string | undefined

          return (
            <div key={n.id} style={{ background: 'var(--bg-secondary)' }}
              className='flex items-start gap-3 p-3 rounded-lg'>
              <div style={{ background: 'var(--purple)', width: '6px', height: '6px', flexShrink: 0, marginTop: '6px' }}
                className='rounded-full' />
              <div className='flex-1 min-w-0'>

                {n.type === 'new_message' && (
                  <Link href={'/messages/' + (p.conversation_id as string)}
                    className='hover:opacity-80'>
                    <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>
                      New message from {p.sender_name as string}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5 truncate'>
                      {p.preview as string}
                    </div>
                  </Link>
                )}

                {n.type === 'auction_invite' && (
                  <>
                    <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>
                      Private auction invite
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }} className='text-xs mt-0.5'>
                      {p.seller_name as string} invited you to bid on <em>{p.auction_title as string}</em>
                    </div>
                    {!responded ? (
                      <div className='flex gap-2 mt-2'>
                        <button
                          onClick={() => handleInviteResponse(n, 'accepted')}
                          disabled={loadingId === n.id}
                          style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'var(--green)', color: 'white', opacity: loadingId === n.id ? 0.6 : 1 }}>
                          Accept
                        </button>
                        <button
                          onClick={() => handleInviteResponse(n, 'declined')}
                          disabled={loadingId === n.id}
                          style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text-secondary)', opacity: loadingId === n.id ? 0.6 : 1 }}>
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: responded === 'accepted' ? 'var(--green)' : 'var(--text-muted)', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                        {responded === 'accepted' ? 'Accepted' : 'Declined'}
                      </div>
                    )}
                  </>
                )}

                {n.type !== 'new_message' && n.type !== 'auction_invite' && (
                  <>
                    <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>
                      {n.type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5'>
                      {new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
