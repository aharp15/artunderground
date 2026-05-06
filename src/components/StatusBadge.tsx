'use client'

import { useState } from 'react'

interface StatusStyle {
  color: string
  background: string
  borderColor: string
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  listed:     { color: '#1D9E75', background: '#0a1f18', borderColor: '#1D9E75' },
  in_auction: { color: '#D85A30', background: '#1a0a08', borderColor: '#D85A30' },
  draft:      { color: '#888780', background: '#1A1A1A', borderColor: '#333333' },
  sold:       { color: '#7F77DD', background: '#1a1933', borderColor: '#7F77DD' },
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <span style={style} className='text-xs px-1.5 py-0.5 rounded border font-medium'>
      {status.replace('_', ' ')}
    </span>
  )
}
