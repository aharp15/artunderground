import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/SiteNav'
import Link from 'next/link'

export default async function ArtistsPage() {
  const supabase = await createServerSupabaseClient()

  const [profilesRes, artworkCountRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, location, bio, roles')
      .contains('roles', ['artist'])
      .order('created_at', { ascending: false }),
    supabase
      .from('artworks')
      .select('artist_id')
      .in('status', ['listed', 'in_auction']),
  ])

  const artists = (profilesRes.data ?? []) as any[]

  // Build a count map: artist_id → number of listed works
  const countMap = (artworkCountRes.data ?? []).reduce(
    (acc: Record<string, number>, row: any) => {
      acc[row.artist_id] = (acc[row.artist_id] ?? 0) + 1
      return acc
    },
    {}
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='artists' />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '26px', fontWeight: 500, marginBottom: '6px' }}>
            Artists
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {artists.length > 0
              ? artists.length + ' artist' + (artists.length !== 1 ? 's' : '') + ' on ArtUNDERGROUND'
              : 'No artists yet — be the first to join'}
          </p>
        </div>

        {artists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--text-muted)' }}>art</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>No artists yet</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Be the first to join as an artist.
            </p>
            <Link href='/auth'
              style={{ background: 'var(--purple)', color: 'white', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>
              Join as an artist
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {artists.map((artist: any) => (
              <Link
                key={artist.id}
                href={'/artists/' + artist.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'block',
                  textDecoration: 'none',
                }}
                className='hover:border-purple-500 transition-colors group'
              >
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: '#26215C', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '15px', fontWeight: 500,
                    color: '#AFA9EC', flexShrink: 0,
                  }}>
                    {artist.display_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {artist.display_name}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                      {artist.location ?? 'ArtUNDERGROUND'}
                    </div>
                  </div>
                </div>

                {/* Bio snippet */}
                {artist.bio && (
                  <p style={{
                    color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.55,
                    marginBottom: '14px',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {artist.bio}
                  </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {countMap[artist.id] ?? 0} work{(countMap[artist.id] ?? 0) !== 1 ? 's' : ''} listed
                  </span>
                  <span style={{ color: 'var(--purple)', fontSize: '12px', fontWeight: 500 }}>
                    View profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
