'use client'

import { useState, useRef, useCallback } from 'react'

interface Props {
  value:    string[]           // current image URLs
  onChange: (urls: string[]) => void
  max?:     number             // max images (default 6)
}

interface UploadState {
  id:       string
  file:     File
  preview:  string
  status:   'pending' | 'uploading' | 'done' | 'error'
  url?:     string
  error?:   string
  progress: number
}

export function ImageUpload({ value, onChange, max = 6 }: Props) {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateUpload = (id: string, patch: Partial<UploadState>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
  }

  const uploadFile = useCallback(async (file: File) => {
    const id      = Math.random().toString(36).slice(2)
    const preview = URL.createObjectURL(file)

    // Add to upload queue
    setUploads(prev => [...prev, { id, file, preview, status: 'uploading', progress: 0 }])

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress (fetch does not expose upload progress natively)
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(u =>
          u.id === id && u.progress < 85
            ? { ...u, progress: u.progress + 15 }
            : u
        ))
      }, 200)

      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      clearInterval(progressInterval)

      if (!res.ok) {
        updateUpload(id, { status: 'error', error: data.error, progress: 0 })
        return
      }

      updateUpload(id, { status: 'done', url: data.url, progress: 100 })

      // Add to the value array and notify parent
      onChange([...value, data.url])

    } catch (err) {
      updateUpload(id, { status: 'error', error: 'Upload failed', progress: 0 })
    }
  }, [value, onChange])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const remaining = max - value.length
    Array.from(files).slice(0, remaining).forEach(uploadFile)
  }

  const removeImage = (url: string) => {
    onChange(value.filter(u => u !== url))
  }

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id))
  }

  const canAddMore = value.length + uploads.filter(u => u.status !== 'error').length < max

  return (
    <div className='space-y-3'>

      {/* Existing images */}
      {value.length > 0 && (
        <div className='grid grid-cols-3 gap-2'>
          {value.map((url, i) => (
            <div key={url} className='relative group aspect-square rounded-lg overflow-hidden border border-gray-200'>
              <img src={url} alt={`Artwork image ${i + 1}`} className='w-full h-full object-cover' />
              <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                <button
                  onClick={() => removeImage(url)}
                  className='bg-white text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg'
                >
                  Remove
                </button>
              </div>
              {i === 0 && (
                <div className='absolute top-1.5 left-1.5 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-medium'>
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* In-progress uploads */}
      {uploads.filter(u => u.status !== 'done').map(upload => (
        <div key={upload.id} className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200'>
          <img src={upload.preview} alt='' className='w-12 h-12 object-cover rounded-lg flex-shrink-0' />
          <div className='flex-1 min-w-0'>
            <div className='text-sm font-medium text-gray-700 truncate'>{upload.file.name}</div>
            {upload.status === 'uploading' && (
              <div className='mt-1.5'>
                <div className='h-1.5 bg-gray-200 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-purple-500 rounded-full transition-all duration-300'
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <div className='text-xs text-gray-400 mt-1'>Uploading...</div>
              </div>
            )}
            {upload.status === 'error' && (
              <div className='text-xs text-red-500 mt-1'>{upload.error}</div>
            )}
          </div>
          {upload.status === 'error' && (
            <button onClick={() => removeUpload(upload.id)} className='text-gray-400 hover:text-gray-600 text-lg'>x</button>
          )}
        </div>
      ))}

      {/* Drop zone */}
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={[
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
            dragging
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
          ].join(' ')}
        >
          <div className='text-2xl mb-2'>+</div>
          <div className='text-sm font-medium text-gray-700'>
            {value.length === 0 ? 'Upload artwork images' : 'Add more images'}
          </div>
          <div className='text-xs text-gray-400 mt-1'>
            JPEG, PNG or WebP up to 5MB
            {max > 1 && ` - up to ${max} images`}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/jpg,image/png,image/webp'
        multiple={max > 1}
        className='hidden'
        onChange={e => handleFiles(e.target.files)}
      />

      {value.length > 0 && (
        <p className='text-xs text-gray-400'>
          First image is used as the cover. Drag to reorder coming soon.
        </p>
      )}
    </div>
  )
}
