'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavLink { href: string; label: string }

interface Props {
  links:              NavLink[]
  isArtist:           boolean
  isLoggedIn:         boolean
  unreadMessages:     number
  unreadNotifications: number
}

export function MobileMenu({ links, isArtist, isLoggedIn, unreadMessages, unreadNotifications }: Props) {
  const [open, setOpen] = useState(false)
  const total = unreadMessages + unreadNotifications

  return (
    <div className='sm:hidden'>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ color: 'var(--text-secondary)', position: 'relative' }}
        className='flex items-center justify-center w-8 h-8'>
        {open ? (
          <svg width='18' height='18' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
            <path strokeLinecap='round' d='M6 18L18 6M6 6l12 12' />
          </svg>
        ) : (
          <svg width='18' height='18' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
            <path strokeLinecap='round' d='M4 6h16M4 12h16M4 18h16' />
          </svg>
        )}
        {total > 0 && !open && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            background: 'var(--purple)', color: 'white',
            borderRadius: '50%', width: '14px', height: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8px', fontWeight: 600,
          }}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, top: '56px',
            background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)',
            zIndex: 50, overflowY: 'auto',
          }}>
          <div className='px-6 py-6 space-y-1'>
            {links.map(({ href, label }) => (
              <Link key={href} href={href}
                style={{ color: 'var(--text-primary)', fontSize: '16px' }}
                className='flex items-center py-3 border-b hover:opacity-70'
                onClick={() => setOpen(false)}>
                <span style={{ borderColor: 'var(--border)' }}>{label}</span>
              </Link>
            ))}

            {isLoggedIn && (
              <>
                <Link href='/search' style={{ color: 'var(--text-secondary)', fontSize: '15px' }}
                  className='flex items-center py-3 border-b hover:opacity-70'
                  onClick={() => setOpen(false)}>
                  Search
                </Link>
                <Link href='/messages' style={{ color: 'var(--text-secondary)', fontSize: '15px' }}
                  className='flex items-center justify-between py-3 border-b hover:opacity-70'
                  onClick={() => setOpen(false)}>
                  Messages
                  {unreadMessages > 0 && (
                    <span style={{ background: 'var(--purple)', color: 'white', borderRadius: '999px', padding: '2px 7px', fontSize: '11px' }}>
                      {unreadMessages}
                    </span>
                  )}
                </Link>
                <Link href='/notifications' style={{ color: 'var(--text-secondary)', fontSize: '15px' }}
                  className='flex items-center justify-between py-3 border-b hover:opacity-70'
                  onClick={() => setOpen(false)}>
                  Notifications
                  {unreadNotifications > 0 && (
                    <span style={{ background: 'var(--purple)', color: 'white', borderRadius: '999px', padding: '2px 7px', fontSize: '11px' }}>
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
                {isArtist && (
                  <Link href='/portfolio/upload' style={{ color: 'var(--text-secondary)', fontSize: '15px' }}
                    className='flex items-center py-3 border-b hover:opacity-70'
                    onClick={() => setOpen(false)}>
                    + Upload work
                  </Link>
                )}
                <Link href='/dashboard' style={{ color: 'var(--text-secondary)', fontSize: '15px' }}
                  className='flex items-center py-3 border-b hover:opacity-70'
                  onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <Link href='/settings' style={{ color: 'var(--text-secondary)', fontSize: '15px' }}
                  className='flex items-center py-3 border-b hover:opacity-70'
                  onClick={() => setOpen(false)}>
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
