'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  artworkId:    string
  artworkTitle: string
}

export function CreateAuctionButton({ artworkId, artworkTitle }: Props) {
  const router  = useRouter()
  const [open,    setOpen]    = useState(false)
  const [reserve, setReserve] = useState('')
  const [days,    setDays]    = useState('7')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

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
        }),
      })

      // Safely parse response - handle empty or non-JSON bodies
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

      setOpen(false)
      setReserve('')
      router.refresh()

    } catch (err) {
      setError('Network error - please try again')
      setLoading(false)
    }
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
      onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setError(null) } }}>
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', width: '100%', maxWidth: '360px' }}
        className='border rounded-2xl p-6'>

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
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
              Minimum price you will accept. Bidding starts here.
            </p>
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
              {loading ? 'Creating...' : 'Start auction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
