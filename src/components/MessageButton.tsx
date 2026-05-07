'use client'

import { useState } from 'react'

interface Props {
  otherProfileId: string
  artworkId?: string
  label?: string
}

export function MessageButton({ otherProfileId, artworkId, label = 'Message' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ other_profile_id: otherProfileId, artwork_id: artworkId ?? null }),
      })
      const data = await res.json()
      if (res.ok && data.conversation_id) {
        window.location.href = '/messages/' + data.conversation_id
        return
      }
      setError(data.error ?? 'Could not open conversation')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          background: 'transparent',
          border: '0.5px solid var(--border)',
          color: 'var(--text-secondary)',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>
        {loading ? 'Opening...' : label}
      </button>
      {error && (
        <span style={{ color: 'var(--red)', fontSize: '11px' }}>{error}</span>
      )}
    </div>
  )
}
