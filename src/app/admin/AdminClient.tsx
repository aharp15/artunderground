'use client'

import { useState } from 'react'
import Link from 'next/link'

type Tab = 'users' | 'artworks' | 'transactions'

interface User {
  id: string; display_name: string; roles: string[]; location: string | null
  created_at: string; is_admin: boolean
}
interface Artwork {
  id: string; title: string; status: string; created_at: string
  artist: { id: string; display_name: string } | null
}
interface Transaction {
  id: string; sale_price_gbp: number; commission_gbp: number
  status: string; completed_at: string | null
  artwork: { id: string; title: string } | null
}

export function AdminClient({ users, artworks, transactions }: {
  users: User[]; artworks: Artwork[]; transactions: Transaction[]
}) {
  const [tab,    setTab]    = useState<Tab>('artworks')
  const [filter, setFilter] = useState('')

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'artworks',     label: 'Artworks',     count: artworks.length },
    { key: 'users',        label: 'Users',        count: users.length },
    { key: 'transactions', label: 'Transactions', count: transactions.length },
  ]

  async function setArtworkStatus(id: string, status: string) {
    await fetch(`/api/admin/artworks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    window.location.reload()
  }

  async function toggleAdmin(id: string, current: boolean) {
    const action = current ? 'Remove admin access from' : 'Grant admin access to'
    const name = users.find(u => u.id === id)?.display_name ?? 'this user'
    if (!confirm(`${action} ${name}?`)) return
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_admin: !current }),
    })
    if (res.ok) window.location.reload()
  }

  const q = filter.toLowerCase()

  const filteredUsers = users.filter(u =>
    !q || u.display_name.toLowerCase().includes(q) || u.roles.join(',').includes(q)
  )
  const filteredArtworks = artworks.filter(w =>
    !q || w.title.toLowerCase().includes(q) || w.status.includes(q) ||
    w.artist?.display_name.toLowerCase().includes(q)
  )

  return (
    <div>
      {/* Tabs */}
      <div style={{ borderColor: 'var(--border)' }} className='flex gap-1 border-b mb-6'>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setFilter('') }}
            style={{
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--purple)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
            className='px-4 py-2.5 text-sm font-medium'>
            {t.label} <span style={{ color: 'var(--text-muted)' }} className='text-xs ml-1'>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Filter */}
      {tab !== 'transactions' && (
        <div className='mb-4'>
          <input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder={`Filter ${tab}…`}
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            className='border rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-purple-500' />
        </div>
      )}

      {/* Artworks tab */}
      {tab === 'artworks' && (
        <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr style={{ borderColor: 'var(--border)' }} className='border-b'>
                {['Title', 'Artist', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                    className='text-left px-4 py-3 font-medium'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredArtworks.map(w => (
                <tr key={w.id} style={{ borderColor: 'var(--border)' }} className='border-b last:border-0 hover:bg-purple-500/5'>
                  <td className='px-4 py-3'>
                    <Link href={`/artworks/${w.id}`}
                      style={{ color: 'var(--text-primary)' }}
                      className='hover:opacity-70 font-medium'>{w.title}</Link>
                  </td>
                  <td className='px-4 py-3'>
                    {w.artist && (
                      <Link href={`/artists/${w.artist.id}`}
                        style={{ color: 'var(--text-secondary)' }}
                        className='hover:opacity-70'>{w.artist.display_name}</Link>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    <span style={{
                      background: w.status === 'listed' ? '#0a1f18' : w.status === 'sold' ? '#1a0a0a' : 'var(--bg-secondary)',
                      color: w.status === 'listed' ? '#1D9E75' : w.status === 'sold' ? '#ef4444' : 'var(--text-muted)',
                      borderColor: w.status === 'listed' ? '#1D9E7540' : w.status === 'sold' ? '#ef444440' : 'var(--border)',
                    }} className='border rounded-full px-2 py-0.5 text-xs'>
                      {w.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }} className='px-4 py-3 text-xs'>
                    {new Date(w.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex gap-2'>
                      {w.status === 'draft' && (
                        <button onClick={() => setArtworkStatus(w.id, 'listed')}
                          style={{ color: '#1D9E75', fontSize: '11px' }}
                          className='hover:opacity-70'>Approve</button>
                      )}
                      {w.status === 'listed' && (
                        <button onClick={() => setArtworkStatus(w.id, 'unlisted')}
                          style={{ color: '#ef4444', fontSize: '11px' }}
                          className='hover:opacity-70'>Remove</button>
                      )}
                      {w.status === 'unlisted' && (
                        <button onClick={() => setArtworkStatus(w.id, 'listed')}
                          style={{ color: '#1D9E75', fontSize: '11px' }}
                          className='hover:opacity-70'>Restore</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr style={{ borderColor: 'var(--border)' }} className='border-b'>
                {['Name', 'Roles', 'Location', 'Joined', 'Admin'].map(h => (
                  <th key={h} style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                    className='text-left px-4 py-3 font-medium'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderColor: 'var(--border)' }} className='border-b last:border-0 hover:bg-purple-500/5'>
                  <td className='px-4 py-3'>
                    <Link href={`/artists/${u.id}`}
                      style={{ color: 'var(--text-primary)' }}
                      className='hover:opacity-70 font-medium flex items-center gap-2'>
                      {u.display_name}
                      {u.is_admin && (
                        <span style={{ color: 'var(--purple)', fontSize: '10px', background: '#1a1933', padding: '1px 6px', borderRadius: '999px' }}>
                          admin
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex gap-1 flex-wrap'>
                      {u.roles.map((r: string) => (
                        <span key={r} style={{ color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '999px' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }} className='px-4 py-3 text-xs'>{u.location ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }} className='px-4 py-3 text-xs'>
                    {new Date(u.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className='px-4 py-3'>
                    <button onClick={() => toggleAdmin(u.id, u.is_admin)}
                      style={{
                        fontSize: '11px',
                        color: u.is_admin ? '#ef4444' : '#1D9E75',
                      }}
                      className='hover:opacity-70'>
                      {u.is_admin ? 'Revoke' : 'Grant'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr style={{ borderColor: 'var(--border)' }} className='border-b'>
                {['Artwork', 'Sale price', 'Commission', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                    className='text-left px-4 py-3 font-medium'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} style={{ borderColor: 'var(--border)' }} className='border-b last:border-0 hover:bg-purple-500/5'>
                  <td className='px-4 py-3'>
                    {t.artwork
                      ? <Link href={`/artworks/${t.artwork.id}`} style={{ color: 'var(--text-primary)' }} className='hover:opacity-70'>{t.artwork.title}</Link>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-primary)' }} className='px-4 py-3 font-medium'>
                    £{t.sale_price_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ color: '#1D9E75' }} className='px-4 py-3'>
                    £{t.commission_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                  <td className='px-4 py-3'>
                    <span style={{ color: t.status === 'completed' ? '#1D9E75' : 'var(--text-muted)' }} className='text-xs'>{t.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }} className='px-4 py-3 text-xs'>
                    {t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-GB') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
