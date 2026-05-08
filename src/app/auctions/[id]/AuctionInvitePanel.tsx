'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Invite {
  id: string
  invitee_id: string
  status: string
  invitee: { id: string; display_name: string; avatar_url: string | null } | null
}

export function AuctionInvitePanel({ auctionId, visibility: initialVisibility, isLive }: { auctionId: string; visibility: 'public' | 'private'; isLive: boolean }) {
  const [invites,       setInvites]       = useState<Invite[]>([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [visibility,    setVisibility]    = useState<'public' | 'private'>(initialVisibility)
  const [visLoading,    setVisLoading]    = useState(false)
  const [inviteCode,    setInviteCode]    = useState<string | null>(null)
  const [codeLoading,   setCodeLoading]   = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [endLoading,    setEndLoading]    = useState(false)
  const [ended,         setEnded]         = useState(false)

  async function toggleVisibility(next: 'public' | 'private') {
    setVisLoading(true)
    const res = await fetch(`/api/auctions/${auctionId}/visibility`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ visibility: next }),
    })
    if (res.ok) setVisibility(next)
    setVisLoading(false)
  }

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}/invites`)
      .then(r => r.json())
      .then(d => { setInvites(d.invites ?? []); setLoading(false) })
      .catch(() => setLoading(false))
    // Load existing invite code if one exists
    fetch(`/api/auctions/${auctionId}/invite-code`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.code) setInviteCode(d.code) })
      .catch(() => {})
  }, [auctionId])

  async function generateInviteCode() {
    setCodeLoading(true)
    const res = await fetch(`/api/auctions/${auctionId}/invite-code`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setInviteCode(data.code)
    }
    setCodeLoading(false)
  }

  async function revokeInviteCode() {
    setCodeLoading(true)
    await fetch(`/api/auctions/${auctionId}/invite-code`, { method: 'DELETE' })
    setInviteCode(null)
    setCodeLoading(false)
  }

  async function endAuction() {
    if (!confirm('End this auction now? The current highest bidder will win.')) return
    setEndLoading(true)
    const res = await fetch(`/api/auctions/${auctionId}/end`, { method: 'PATCH' })
    if (res.ok) setEnded(true)
    setEndLoading(false)
  }

  function copyLink() {
    if (!inviteCode) return
    const url = `${window.location.origin}/invite/${inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
      <h3 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
        Manage auction
      </h3>

      {/* Visibility toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>Visibility</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['public', 'private'] as const).map(v => (
            <button key={v} onClick={() => toggleVisibility(v)} disabled={visLoading || visibility === v}
              style={{
                flex: 1, padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                border: '0.5px solid',
                borderColor: visibility === v ? 'var(--purple)' : 'var(--border)',
                background:  visibility === v ? '#1a1933' : 'var(--bg-secondary)',
                color:       visibility === v ? 'var(--purple)' : 'var(--text-muted)',
                cursor: visibility === v ? 'default' : visLoading ? 'wait' : 'pointer',
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

      {/* Invite link */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>Invite link</div>
        {inviteCode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                /invite/{inviteCode}
              </div>
              <button onClick={copyLink} style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '0.5px solid var(--border)', background: copied ? '#0a1f18' : 'var(--bg-secondary)', color: copied ? 'var(--green)' : 'var(--text-primary)', cursor: 'pointer', flexShrink: 0 }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={revokeInviteCode} disabled={codeLoading} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, opacity: codeLoading ? 0.5 : 1 }}>
              Revoke link
            </button>
          </div>
        ) : (
          <button onClick={generateInviteCode} disabled={codeLoading} style={{ width: '100%', padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '0.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: codeLoading ? 'wait' : 'pointer', opacity: codeLoading ? 0.6 : 1 }}>
            {codeLoading ? 'Generating…' : 'Generate invite link'}
          </button>
        )}
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>Invite collectors</div>

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

      {/* End auction early */}
      {isLive && !ended && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
          <button
            onClick={endAuction}
            disabled={endLoading}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '0.5px solid var(--red)', background: '#1a0a08', color: 'var(--red)', cursor: endLoading ? 'wait' : 'pointer', opacity: endLoading ? 0.6 : 1 }}
          >
            {endLoading ? 'Ending…' : 'End auction now'}
          </button>
        </div>
      )}
      {ended && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>Auction ended — winner can now pay.</p>
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
