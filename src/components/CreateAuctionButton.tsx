'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  artworkId:    string
  artworkTitle: string
}

export function CreateAuctionButton({ artworkId, artworkTitle }: Props) {
  const router  = useRouter()
  const [open,       setOpen]       = useState(false)
  const [reserve,    setReserve]    = useState('')
  const [days,       setDays]       = useState('7')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Invite step state (shown after private auction creation)
  const [auctionId,    setAuctionId]    = useState<string | null>(null)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [invitedIds,   setInvitedIds]   = useState<Set<string>>(new Set())
  const [inviteLoading, setInviteLoading] = useState(false)

  async function handleCreate() {
    const reserveNum = parseFloat(reserve)
    if (!reserve.trim() || isNaN(reserveNum) || reserveNum <= 0) {
      setError('Please enter a valid reserve price greater than zero')
      return
    }

    setLoading(true)
    setError(null)

    const opensAt  = new Date()
    const closesAt = new Date()
    closesAt.setDate(closesAt.getDate() + parseInt(days))

    try {
      const res = await fetch('/api/auctions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artwork_id:  artworkId,
          reserve_gbp: reserveNum,
          opens_at:    opensAt.toISOString(),
          closes_at:   closesAt.toISOString(),
          visibility,
        }),
      })

      let data: any = {}
      const text = await res.text()
      if (text) {
        try { data = JSON.parse(text) } catch { data = { error: 'Server error (status ' + res.status + ')' } }
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to create auction (status ' + res.status + ')')
        setLoading(false)
        return
      }

      if (visibility === 'private') {
        setAuctionId(data.auction.id)
        setLoading(false)
      } else {
        setOpen(false)
        setReserve('')
        router.refresh()
      }

    } catch {
      setError('Network error - please try again')
      setLoading(false)
    }
  }

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
    if (!auctionId || invitedIds.has(inviteeId)) return
    setInviteLoading(true)
    const res = await fetch(`/api/auctions/${auctionId}/invites`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitee_id: inviteeId }),
    })
    if (res.ok) {
      setInvitedIds(prev => new Set([...prev, inviteeId]))
    }
    setInviteLoading(false)
  }

  function handleDone() {
    setOpen(false)
    setReserve('')
    setAuctionId(null)
    setSearchQuery('')
    setSearchResults([])
    setInvitedIds(new Set())
    setVisibility('public')
    router.refresh()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ color: '#D85A30', borderColor: '#D85A30', background: '#1a0a08', fontSize: '10px' }}
      className='border rounded px-1.5 py-0.5 font-medium hover:opacity-80 transition-opacity whitespace-nowrap'>
      Auction
    </button>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50 }}
      className='flex items-center justify-center p-4'
      onClick={e => { if (e.target === e.currentTarget && !auctionId) { setOpen(false); setError(null) } }}>
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', width: '100%', maxWidth: '380px' }}
        className='border rounded-2xl p-6'>

        {/* ── Invite step (private auction created) ── */}
        {auctionId ? (
          <>
            <h2 style={{ color: 'var(--text-primary)' }} className='text-lg font-medium mb-1'>
              Invite collectors
            </h2>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mb-5'>
              Search for collectors to invite to this private auction.
            </p>

            <input
              type='text'
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder='Search by name...'
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px',
              }}
            />

            {searchResults.length > 0 && (
              <div style={{ border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                {searchResults.map(p => (
                  <div key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, flexShrink: 0 }}>
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

            {invitedIds.size > 0 && (
              <p style={{ color: 'var(--green)', fontSize: '12px', marginBottom: '12px' }}>
                {invitedIds.size} collector{invitedIds.size !== 1 ? 's' : ''} invited
              </p>
            )}

            <button onClick={handleDone}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'var(--purple)', color: 'white' }}>
              Done
            </button>
          </>
        ) : (
          /* ── Create auction step ── */
          <>
            <h2 style={{ color: 'var(--text-primary)' }} className='text-lg font-medium mb-1'>
              Create auction
            </h2>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mb-5 truncate'>
              {artworkTitle}
            </p>

            <div className='space-y-4'>
              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '6px' }}>
                  Reserve price (GBP) *
                </label>
                <input type='number' value={reserve} onChange={e => setReserve(e.target.value)}
                  placeholder='e.g. 500' min='1' step='1'
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', fontSize: '14px',
                  }} />
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '6px' }}>
                  Auction duration
                </label>
                <select value={days} onChange={e => setDays(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', fontSize: '14px',
                  }}>
                  <option value='1'>1 day</option>
                  <option value='3'>3 days</option>
                  <option value='7'>7 days</option>
                  <option value='14'>14 days</option>
                </select>
              </div>

              <div>
                <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '12px', marginBottom: '6px' }}>
                  Visibility
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['public', 'private'] as const).map(v => (
                    <button key={v} onClick={() => setVisibility(v)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px',
                        border: '0.5px solid',
                        borderColor: visibility === v ? 'var(--purple)' : 'var(--border)',
                        background: visibility === v ? '#1a1933' : 'var(--bg-secondary)',
                        color: visibility === v ? 'var(--purple)' : 'var(--text-secondary)',
                        fontWeight: visibility === v ? 500 : 400,
                      }}>
                      {v === 'public' ? 'Public' : 'Private'}
                    </button>
                  ))}
                </div>
                {visibility === 'private' && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '5px' }}>
                    Only invited collectors can see and bid.
                  </p>
                )}
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '8px', padding: '10px 12px', border: '0.5px solid' }}>
                <div className='flex justify-between text-xs mb-1'>
                  <span style={{ color: 'var(--text-muted)' }}>Platform fee</span>
                  <span style={{ color: 'var(--text-secondary)' }}>12% of hammer price</span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span style={{ color: 'var(--text-muted)' }}>Buyer's premium</span>
                  <span style={{ color: 'var(--text-secondary)' }}>TBC</span>
                </div>
              </div>

              {error && (
                <div style={{ background: '#1a0808', borderColor: '#D85A30', color: '#D85A30', padding: '8px 12px', borderRadius: '8px', border: '0.5px solid', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setOpen(false); setError(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={loading}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'var(--purple)', color: 'white', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Creating...' : visibility === 'private' ? 'Create & invite' : 'Start auction'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
