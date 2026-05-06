'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  otherProfileId: string
  artworkId?: string
  label?: string
}

export function MessageButton({ otherProfileId, artworkId, label = 'Message' }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ other_profile_id: otherProfileId, artwork_id: artworkId ?? null }),
      })
      const data = await res.json()
      if (res.ok && data.conversation_id) {
        router.push('/messages/' + data.conversation_id)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
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
      {loading ? '...' : label}
    </button>
  )
}
