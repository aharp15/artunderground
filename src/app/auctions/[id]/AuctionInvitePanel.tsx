'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Invite {
  id: string
  invitee_id: string
  status: string
  invitee: { id: string; display_name: string; avatar_url: string | null } | null
}

export function AuctionInvitePanel({ auctionId }: { auctionId: string }) {
  const [invites,       setInvites]       = useState<Invite[]>([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}/invites`)
      .then(r => r.json())
      .then(d => { setInvites(d.invites ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [auctionId])

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${q}%`)
      .limit(6)
    setSearchResults(data ?? [])
  }

  async function handleInvite(inviteeId: string) {
    if (invites.some(i => i.invitee_id === inviteeId)) return
    setInviteLoading(true)
    const res = await fetch(`/api/auctions/${auctionId}/invites`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitee_id: inviteeId }),
    })
    if (res.ok) {
      const data = await res.json()
      setInvites(prev => [...prev, data.invite])
      setSearchQuery('')
      setSearchResults([])
    }
    setInviteLoading(false)
  }

  const invitedIds = new Set(invites.map(i => i.invitee_id))

  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', background: '#1a1933', border: '0.5px solid var(--purple)', borderRadius: '8px', padding: '8px 12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--purple)' }}>Private auction — you are the seller</span>
      </div>

      <h3 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginBottom: '14px' }}>
        Invite collectors
      </h3>

      <input
        type='text'
        value={searchQuery}
        onChange={e => handleSearch(e.target.value)}
        placeholder='Search collector by name...'
        style={{
          width: '100%', padding: '9px 12px', borderRadius: '8px',
          border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
          color: 'var(--text-primary)', fontSize: '13px', marginBottom: '8px',
        }}
      />

      {searchResults.length > 0 && (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          {searchResults.map(p => (
            <div key={p.id}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0 }}>
                {p.display_name?.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1 }}>{p.display_name}</span>
              <button
                onClick={() => handleInvite(p.id)}
                disabled={inviteLoading || invitedIds.has(p.id)}
                style={{
                  fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 500,
                  background: invitedIds.has(p.id) ? 'var(--bg-hover)' : 'var(--purple)',
                  color: invitedIds.has(p.id) ? 'var(--text-muted)' : 'white',
                  opacity: inviteLoading ? 0.6 : 1,
                }}>
                {invitedIds.has(p.id) ? 'Invited' : 'Invite'}
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>Loading invites...</p>
      ) : invites.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>No invites sent yet</p>
      ) : (
        <div style={{ marginTop: '8px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>Invitees</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {invites.map(invite => (
              <div key={invite.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0 }}>
                  {invite.invitee?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                </div>
                <span style={{ color: 'var(--text-primary)', fontSize: '13px', flex: 1 }}>
                  {invite.invitee?.display_name ?? 'Unknown'}
                </span>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '100px', fontWeight: 500,
                  background: invite.status === 'accepted' ? '#0a1f18' : invite.status === 'declined' ? '#1a0a08' : '#1a1933',
                  color:      invite.status === 'accepted' ? 'var(--green)'  : invite.status === 'declined' ? 'var(--red)' : 'var(--purple)',
                  border: '0.5px solid',
                  borderColor: invite.status === 'accepted' ? 'var(--green)' : invite.status === 'declined' ? 'var(--red)' : 'var(--purple)',
                }}>
                  {invite.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
