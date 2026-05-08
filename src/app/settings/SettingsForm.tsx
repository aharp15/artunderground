'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
  display_name: string
  bio: string | null
  location: string | null
  avatar_url: string | null
  roles: string[]
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio]                 = useState(profile.bio ?? '')
  const [location, setLocation]       = useState(profile.location ?? '')
  const [avatarUrl, setAvatarUrl]     = useState(profile.avatar_url ?? '')
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url ?? '')
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return }
      setAvatarUrl(data.url)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (uploading) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const body: Record<string, unknown> = { display_name: displayName }
      if (bio)       body.bio       = bio
      if (location)  body.location  = location
      if (avatarUrl) body.avatar_url = avatarUrl
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const initials = displayName.slice(0, 2).toUpperCase() || 'AU'

  return (
    <form onSubmit={handleSave} className='space-y-6'>

      {/* Avatar */}
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        className='border rounded-xl p-5'>
        <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-4'>
          Profile photo
        </label>
        <div className='flex items-center gap-5'>
          {avatarPreview ? (
            <img src={avatarPreview} alt=''
              className='w-16 h-16 rounded-full object-cover flex-shrink-0' />
          ) : (
            <div style={{ background: '#26215C', color: '#AFA9EC' }}
              className='w-16 h-16 rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0'>
              {initials}
            </div>
          )}
          <div>
            <button type='button'
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontSize: '13px' }}
              className='border rounded-lg px-4 py-2 hover:opacity-80 disabled:opacity-50'>
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
            <p style={{ color: 'var(--text-muted)' }} className='text-xs mt-1.5'>JPEG, PNG or WebP · max 2 MB</p>
          </div>
          <input ref={fileInputRef} type='file' accept='image/*' className='hidden'
            onChange={handleAvatarChange} />
        </div>
      </div>

      {/* Fields */}
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        className='border rounded-xl p-5 space-y-4'>
        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>
            Display name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required minLength={2} maxLength={80}
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            className='w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
          />
        </div>

        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>
            Location
          </label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            maxLength={100}
            placeholder='e.g. London, UK'
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            className='w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:sm:ring-purple-500'
          />
        </div>

        <div>
          <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={600}
            rows={4}
            placeholder='Tell collectors and other artists about yourself…'
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)', resize: 'vertical' }}
            className='w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
          />
          <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-1 text-right'>{bio.length}/600</div>
        </div>
      </div>

      {/* Roles (read-only) */}
      <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        className='border rounded-xl p-5'>
        <label style={{ color: 'var(--text-primary)' }} className='block text-sm font-medium mb-2'>Roles</label>
        <div className='flex flex-wrap gap-2'>
          {profile.roles.map((role: string) => (
            <span key={role}
              style={{ background: '#1a1933', borderColor: 'var(--purple)', color: 'var(--purple)' }}
              className='border rounded-full px-3 py-1 text-xs font-medium capitalize'>
              {role}
            </span>
          ))}
        </div>
        <p style={{ color: 'var(--text-muted)' }} className='text-xs mt-2'>Roles cannot be changed after registration</p>
      </div>

      {error && (
        <p style={{ color: '#ef4444', background: '#1a0a0a', borderColor: '#ef444440' }}
          className='border rounded-lg px-4 py-3 text-sm'>{error}</p>
      )}
      {success && (
        <p style={{ color: '#1D9E75', background: '#0a1f18', borderColor: '#1D9E7540' }}
          className='border rounded-lg px-4 py-3 text-sm'>Profile updated successfully</p>
      )}

      <button type='submit'
        disabled={saving || uploading}
        style={{ background: 'var(--purple)' }}
        className='w-full text-white py-3 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50'>
        {saving ? 'Saving…' : 'Save changes'}
      </button>

    </form>
  )
}
