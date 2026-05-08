'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewExhibitionForm() {
  const router = useRouter()
  const [title,          setTitle]          = useState('')
  const [statement,      setStatement]      = useState('')
  const [visibility,     setVisibility]     = useState<'public' | 'link_only'>('public')
  const [auctionEnabled, setAuctionEnabled] = useState(false)
  const [opensAt,        setOpensAt]        = useState('')
  const [closesAt,       setClosesAt]       = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const body: Record<string, unknown> = { title, visibility, auction_enabled: auctionEnabled }
      if (statement) body.statement = statement
      if (opensAt)   body.opens_at  = new Date(opensAt).toISOString()
      if (closesAt)  body.closes_at = new Date(closesAt).toISOString()

      const res  = await fetch('/api/exhibitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Create failed'); return }
      router.push(`/exhibitions/${data.exhibition.id}/edit`)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
  const inputStyle = { background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

  return (
    <form onSubmit={handleSubmit} className='space-y-5'>

      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5 space-y-4'>
        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>
            Title <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={120}
            style={inputStyle} className={inputCls} />
        </div>

        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>
            Curatorial statement
          </label>
          <textarea value={statement} onChange={e => setStatement(e.target.value)} rows={4} maxLength={1000}
            placeholder='Describe the theme, concept, or vision of this exhibition…'
            style={{ ...inputStyle, resize: 'vertical' }} className={inputCls} />
          <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-1 text-right'>{statement.length}/1000</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5 space-y-4'>
        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Visibility</label>
          <select value={visibility} onChange={e => setVisibility(e.target.value as any)}
            style={inputStyle} className={inputCls}>
            <option value='public'>Public — anyone can view</option>
            <option value='link_only'>Link only — shareable but not listed</option>
          </select>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Opens</label>
            <input type='datetime-local' value={opensAt} onChange={e => setOpensAt(e.target.value)}
              style={inputStyle} className={inputCls} />
          </div>
          <div>
            <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Closes</label>
            <input type='datetime-local' value={closesAt} onChange={e => setClosesAt(e.target.value)}
              style={inputStyle} className={inputCls} />
          </div>
        </div>

        <label className='flex items-center gap-3 cursor-pointer'>
          <input type='checkbox' checked={auctionEnabled} onChange={e => setAuctionEnabled(e.target.checked)}
            className='w-4 h-4 rounded accent-purple-500' />
          <div>
            <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>Enable auction</div>
            <div style={{ color: 'var(--text-muted)' }} className='text-xs'>Allow bidding on works in this exhibition</div>
          </div>
        </label>
      </div>

      {error && (
        <p style={{ color: '#ef4444', background: '#1a0a0a', borderColor: '#ef444440' }}
          className='border rounded-lg px-4 py-3 text-sm'>{error}</p>
      )}

      <button type='submit' disabled={saving}
        style={{ background: 'var(--purple)' }}
        className='w-full text-white py-3 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50'>
        {saving ? 'Creating…' : 'Create exhibition & add artworks →'}
      </button>
    </form>
  )
}
