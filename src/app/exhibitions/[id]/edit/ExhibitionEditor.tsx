'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Artwork { id: string; title: string; image_urls: string[]; status: string }
interface ExhibitionArtwork { position: number; artwork: Artwork }
interface Exhibition {
  id: string; title: string; statement: string | null; status: string
  visibility: string; auction_enabled: boolean
  opens_at: string | null; closes_at: string | null
  artworks: ExhibitionArtwork[]
}

export function ExhibitionEditor({
  exhibition,
  myArtworks,
}: {
  exhibition: Exhibition
  myArtworks: Artwork[]
}) {
  const router = useRouter()
  const [title,          setTitle]          = useState(exhibition.title)
  const [statement,      setStatement]      = useState(exhibition.statement ?? '')
  const [status,         setStatus]         = useState(exhibition.status)
  const [visibility,     setVisibility]     = useState(exhibition.visibility)
  const [auctionEnabled, setAuctionEnabled] = useState(exhibition.auction_enabled)
  const [exArtworks,     setExArtworks]     = useState<ExhibitionArtwork[]>(
    [...(exhibition.artworks ?? [])].sort((a, b) => a.position - b.position)
  )
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const includedIds = new Set(exArtworks.map(ea => ea.artwork.id))

  async function save() {
    setSaving(true); setError(''); setSuccess(false)
    const res = await fetch(`/api/exhibitions/${exhibition.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, statement, status, visibility, auction_enabled: auctionEnabled }),
    })
    setSaving(false)
    if (!res.ok) { setError('Save failed'); return }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
    router.refresh()
  }

  async function addArtwork(artwork: Artwork) {
    const pos = exArtworks.length
    const res = await fetch(`/api/exhibitions/${exhibition.id}/artworks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artwork_id: artwork.id, position: pos }),
    })
    if (res.ok) setExArtworks(prev => [...prev, { position: pos, artwork }])
  }

  async function removeArtwork(artworkId: string) {
    const res = await fetch(`/api/exhibitions/${exhibition.id}/artworks?artwork_id=${artworkId}`, { method: 'DELETE' })
    if (res.ok) setExArtworks(prev => prev.filter(ea => ea.artwork.id !== artworkId))
  }

  const inputCls   = 'w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
  const inputStyle = { background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

  return (
    <div className='space-y-6'>

      {/* Details */}
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5 space-y-4'>
        <h2 style={{ color: 'var(--text-primary)' }} className='font-medium'>Details</h2>
        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} className={inputCls} />
        </div>
        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Curatorial statement</label>
          <textarea value={statement} onChange={e => setStatement(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} className={inputCls} />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle} className={inputCls}>
              <option value='draft'>Draft</option>
              <option value='published'>Published</option>
              <option value='closed'>Closed</option>
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Visibility</label>
            <select value={visibility} onChange={e => setVisibility(e.target.value)} style={inputStyle} className={inputCls}>
              <option value='public'>Public</option>
              <option value='link_only'>Link only</option>
            </select>
          </div>
        </div>
        <label className='flex items-center gap-3 cursor-pointer'>
          <input type='checkbox' checked={auctionEnabled} onChange={e => setAuctionEnabled(e.target.checked)}
            className='w-4 h-4 rounded accent-purple-500' />
          <span style={{ color: 'var(--text-primary)' }} className='text-sm'>Enable auction bidding</span>
        </label>
      </div>

      {/* Save */}
      {error   && <p style={{ color: '#ef4444' }} className='text-sm'>{error}</p>}
      {success && <p style={{ color: '#1D9E75' }} className='text-sm'>Saved</p>}
      <button onClick={save} disabled={saving}
        style={{ background: 'var(--purple)' }}
        className='w-full text-white py-3 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50'>
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      {/* Artworks in exhibition */}
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
        <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-4'>
          Artworks in exhibition ({exArtworks.length})
        </h2>
        {exArtworks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }} className='text-sm'>None added yet</p>
        ) : (
          <div className='space-y-2'>
            {exArtworks.map((ea, idx) => (
              <div key={ea.artwork.id}
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                className='border rounded-lg flex items-center gap-3 p-2.5'>
                <span style={{ color: 'var(--text-muted)' }} className='text-xs w-4 text-center'>{idx + 1}</span>
                <div style={{ background: 'var(--bg-hover)' }}
                  className='w-9 h-9 rounded overflow-hidden flex-shrink-0'>
                  {ea.artwork.image_urls?.[0]
                    ? <img src={ea.artwork.image_urls[0]} alt='' className='w-full h-full object-cover' />
                    : <div className='w-full h-full' />}
                </div>
                <span style={{ color: 'var(--text-primary)' }} className='text-sm flex-1 truncate'>{ea.artwork.title}</span>
                <button onClick={() => removeArtwork(ea.artwork.id)}
                  style={{ color: '#ef4444', fontSize: '11px' }}
                  className='hover:opacity-80'>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add artworks */}
      {myArtworks.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
          <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-4'>Add your artworks</h2>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
            {myArtworks.filter(w => !includedIds.has(w.id)).map(work => (
              <button key={work.id} onClick={() => addArtwork(work)}
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', textAlign: 'left' }}
                className='border rounded-lg overflow-hidden hover:border-purple-500 transition-colors'>
                <div style={{ background: 'var(--bg-hover)' }} className='h-20 overflow-hidden'>
                  {work.image_urls?.[0]
                    ? <img src={work.image_urls[0]} alt='' className='w-full h-full object-cover' />
                    : <div className='w-full h-full' />}
                </div>
                <div className='p-2'>
                  <div style={{ color: 'var(--text-primary)' }} className='text-xs truncate'>{work.title}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className='pt-2'>
        <Link href={`/exhibitions/${exhibition.id}`}
          style={{ color: 'var(--purple)', fontSize: '13px' }}
          className='hover:opacity-80'>
          ← View exhibition
        </Link>
      </div>
    </div>
  )
}
