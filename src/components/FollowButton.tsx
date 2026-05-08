'use client'

import { useState } from 'react'

interface Props {
  artistId:           string
  initialIsFollowing: boolean
  initialCount:       number
}

export function FollowButton({ artistId, initialIsFollowing, initialCount }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [count,       setCount]       = useState(initialCount)
  const [loading,     setLoading]     = useState(false)

  async function toggle() {
    setLoading(true)
    if (isFollowing) {
      const res = await fetch(`/api/follows?following_id=${artistId}`, { method: 'DELETE' })
      if (res.ok) { setIsFollowing(false); setCount(c => Math.max(0, c - 1)) }
    } else {
      const res = await fetch('/api/follows', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ following_id: artistId }),
      })
      if (res.ok) { setIsFollowing(true); setCount(c => c + 1) }
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding:    '7px 16px',
        borderRadius: '8px',
        fontSize:   '12px',
        fontWeight: 500,
        border:     '0.5px solid',
        borderColor: isFollowing ? 'var(--border)'  : 'var(--purple)',
        background:  isFollowing ? 'var(--bg-secondary)' : 'var(--purple)',
        color:       isFollowing ? 'var(--text-secondary)' : 'white',
        cursor:      loading ? 'wait' : 'pointer',
        opacity:     loading ? 0.6 : 1,
        transition:  'all 0.15s',
      }}
    >
      {isFollowing ? `Following · ${count}` : `Follow · ${count}`}
    </button>
  )
}
