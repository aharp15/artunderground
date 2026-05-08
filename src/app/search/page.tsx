import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/SiteNav'
import { Price } from '@/components/Price'
import Link from 'next/link'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams
  const query = q.trim()

  let artists: any[] = []
  let artworks: any[] = []

  if (query.length >= 2) {
    const supabase = await createServerSupabaseClient()
    const pattern = `%${query}%`

    const [artistsRes, artworksRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, bio, location, avatar_url, roles')
        .ilike('display_name', pattern)
        .contains('roles', ['artist'])
        .limit(8),
      supabase
        .from('artworks')
        .select('id, title, medium, price_gbp, image_urls, status, artist:profiles(id, display_name)')
        .ilike('title', pattern)
        .in('status', ['available', 'auctioned'])
        .limit(12),
    ])

    artists = artistsRes.data ?? []
    artworks = artworksRes.data ?? []
  }

  const noResults = query.length >= 2 && artists.length === 0 && artworks.length === 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        {/* Search header */}
        <div className='mb-8'>
          <form action='/search' method='GET'>
            <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              className='border rounded-xl flex items-center gap-3 px-4 py-3'>
              <svg width='18' height='18' fill='none' viewBox='0 0 24 24' stroke='var(--text-muted)' strokeWidth='2'>
                <circle cx='11' cy='11' r='8' /><path d='m21 21-4.35-4.35' strokeLinecap='round' />
              </svg>
              <input
                name='q'
                defaultValue={query}
                placeholder='Search artists and artworks…'
                autoFocus
                style={{ background: 'transparent', color: 'var(--text-primary)', outline: 'none', flex: 1, fontSize: '15px' }}
              />
              <button type='submit'
                style={{ background: 'var(--purple)', color: 'white', fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}>
                Search
              </button>
            </div>
          </form>
          {query && (
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mt-3'>
              {noResults
                ? `No results for "${query}"`
                : `Results for "${query}"`}
            </p>
          )}
        </div>

        {/* Artists */}
        {artists.length > 0 && (
          <section className='mb-10'>
            <h2 style={{ color: 'var(--text-primary)' }} className='font-medium text-lg mb-4'>
              Artists <span style={{ color: 'var(--text-muted)' }} className='text-sm font-normal'>({artists.length})</span>
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
              {artists.map((artist: any) => (
                <Link key={artist.id} href={`/artists/${artist.id}`}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  className='border rounded-xl p-4 hover:border-purple-500/50 transition-colors block'>
                  <div className='flex items-center gap-3 mb-3'>
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt=''
                        className='w-10 h-10 rounded-full object-cover flex-shrink-0' />
                    ) : (
                      <div style={{ background: '#26215C', color: '#AFA9EC' }}
                        className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0'>
                        {artist.display_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className='min-w-0'>
                      <div style={{ color: 'var(--text-primary)' }} className='font-medium text-sm truncate'>
                        {artist.display_name}
                      </div>
                      {artist.location && (
                        <div style={{ color: 'var(--text-muted)' }} className='text-xs truncate'>{artist.location}</div>
                      )}
                    </div>
                  </div>
                  {artist.bio && (
                    <p style={{ color: 'var(--text-secondary)' }} className='text-xs line-clamp-2'>{artist.bio}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Artworks */}
        {artworks.length > 0 && (
          <section>
            <h2 style={{ color: 'var(--text-primary)' }} className='font-medium text-lg mb-4'>
              Artworks <span style={{ color: 'var(--text-muted)' }} className='text-sm font-normal'>({artworks.length})</span>
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
              {artworks.map((work: any) => (
                <Link key={work.id} href={`/artworks/${work.id}`}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  className='border rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors block'>
                  <div style={{ background: 'var(--bg-hover)' }} className='aspect-square overflow-hidden'>
                    {work.image_urls?.[0]
                      ? <img src={work.image_urls[0]} alt={work.title} className='w-full h-full object-cover' />
                      : <div className='w-full h-full flex items-center justify-center'>
                          <span style={{ color: 'var(--text-muted)' }} className='text-xs'>No image</span>
                        </div>}
                  </div>
                  <div className='p-3'>
                    <div style={{ color: 'var(--text-primary)' }} className='font-medium text-sm truncate'>{work.title}</div>
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5 truncate'>
                      {work.artist?.display_name}
                    </div>
                    {work.price_gbp && (
                      <div style={{ color: 'var(--purple)' }} className='text-sm font-medium mt-2'>
                        <Price gbp={work.price_gbp} />
                      </div>
                    )}
                    {work.medium && (
                      <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-1'>{work.medium}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!query && (
          <div className='text-center py-20'>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>
              Search for artists by name or artworks by title
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
