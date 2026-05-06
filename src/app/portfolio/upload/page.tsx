'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImageUpload } from '@/components/ImageUpload'

export default function UploadArtworkPage() {
  const router = useRouter()
  const [images,     setImages]     = useState<string[]>([])
  const [title,      setTitle]      = useState('')
  const [medium,     setMedium]     = useState('')
  const [dimensions, setDimensions] = useState('')
  const [year,       setYear]       = useState(new Date().getFullYear().toString())
  const [price,      setPrice]      = useState('')
  const [status,     setStatus]     = useState<'draft' | 'listed'>('listed')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '0.5px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: '14px',
  }

  async function handleSubmit() {
    if (!title.trim())       { setError('Please add a title'); return }
    if (images.length === 0) { setError('Please upload at least one image'); return }
    setSaving(true); setError(null)
    const res = await fetch('/api/artworks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(), medium: medium.trim() || undefined,
        dimensions: dimensions.trim() || undefined,
        year: year ? parseInt(year) : undefined,
        price_gbp: price ? parseFloat(price) : undefined,
        image_urls: images, status,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false); return }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav style={{ borderBottom: '0.5px solid var(--border)' }}
        className='h-14 flex items-center justify-between px-6'>
        <Link href='/' className='text-white font-medium tracking-widest text-sm'>
          art<span style={{ color: 'var(--purple)' }}>UNDERGROUND</span>
        </Link>
        <div className='flex items-center gap-4'>
          <Link href='/dashboard' style={{ color: 'var(--text-secondary)', fontSize: '13px' }}
            className='hover:text-white'>Dashboard</Link>
          <form action='/auth/signout' method='POST'>
            <button style={{ color: 'var(--text-muted)', fontSize: '12px' }}
              className='hover:text-gray-400'>Sign out</button>
          </form>
        </div>
      </nav>

      <div className='max-w-2xl mx-auto px-6 py-10'>
        <div className='flex items-center gap-2 mb-6' style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link href='/dashboard' className='hover:text-gray-400'>Dashboard</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>Upload artwork</span>
        </div>

        <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium mb-1'>
          Upload a work
        </h1>
        <p style={{ color: 'var(--text-muted)' }} className='text-sm mb-8'>
          Add images and details. You can create an auction from your dashboard after uploading.
        </p>

        <div className='space-y-6'>
          <div>
            <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '10px' }}>
              Images <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <ImageUpload value={images} onChange={setImages} max={6} />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '6px' }}>
              Title <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input type='text' value={title} onChange={e => setTitle(e.target.value)}
              placeholder='e.g. Echoes of Islington' style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '6px' }}>Medium</label>
              <input type='text' value={medium} onChange={e => setMedium(e.target.value)}
                placeholder='e.g. Oil on canvas' style={inputStyle} />
            </div>
            <div>
              <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '6px' }}>Dimensions</label>
              <input type='text' value={dimensions} onChange={e => setDimensions(e.target.value)}
                placeholder='e.g. 80 x 100 cm' style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '6px' }}>Year</label>
              <input type='number' value={year} onChange={e => setYear(e.target.value)}
                placeholder='2024' style={inputStyle} />
            </div>
            <div>
              <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '6px' }}>Price (GBP)</label>
              <input type='number' value={price} onChange={e => setPrice(e.target.value)}
                placeholder='0.00' style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '13px', marginBottom: '8px' }}>
              Listing status
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['listed', 'draft'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                  border: `1.5px solid ${status === s ? 'var(--purple)' : 'var(--border)'}`,
                  background: status === s ? '#1a1933' : 'var(--bg-card)',
                  color: status === s ? 'var(--purple)' : 'var(--text-secondary)',
                }}>
                  {s === 'listed' ? 'List for sale' : 'Save as draft'}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
              {status === 'listed'
                ? 'Visible to collectors immediately. Start an auction from your dashboard.'
                : 'Saved privately. List or auction it later from your portfolio.'}
            </p>
          </div>

          {error && (
            <div style={{ background: '#1a0808', borderColor: 'var(--red)', color: 'var(--red)', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '0.5px solid var(--border)' }}>
            <button onClick={() => router.back()} style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px',
              border: '0.5px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)',
            }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'var(--purple)', color: 'white', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving...' : status === 'listed' ? 'Publish artwork' : 'Save draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
