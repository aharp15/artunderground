import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { Price } from '@/components/Price'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function ExhibitionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exhibition } = await supabase
    .from('exhibitions')
    .select(`
      *,
      curator:profiles(id, display_name, avatar_url, bio),
      artworks:exhibition_artworks(
        position,
        artwork:artworks(id, title, medium, year, price_gbp, image_urls, status,
          artist:profiles(id, display_name, avatar_url))
      )
    `)
    .eq('id', id)
    .single()

  if (!exhibition) notFound()

  const ex  = exhibition as any
  const sorted = (ex.artworks ?? []).sort((a: any, b: any) => a.position - b.position)

  let isCurator = false
  if (user) {
    const { data: p } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
    isCurator = (p as any)?.id === ex.curator?.id
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        {/* Header */}
        <div className='mb-10'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex-1'>
              <div style={{ color: 'var(--purple)', fontSize: '11px', letterSpacing: '0.1em' }} className='mb-2'>
                EXHIBITION
              </div>
              <h1 style={{ color: 'var(--text-primary)' }} className='text-3xl font-medium mb-4'>{ex.title}</h1>
              {ex.statement && (
                <p style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }} className='text-sm leading-relaxed'>
                  {ex.statement}
                </p>
              )}
            </div>
            {isCurator && (
              <Link href={`/exhibitions/${id}/edit`}
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)', fontSize: '13px' }}
                className='border rounded-lg px-4 py-2 hover:opacity-80 whitespace-nowrap shrink-0'>
                Edit exhibition
              </Link>
            )}
          </div>

          {/* Curator credit */}
          <div className='flex items-center gap-3 mt-6'>
            <span style={{ color: 'var(--text-muted)' }} className='text-xs'>Curated by</span>
            <Link href={`/artists/${ex.curator?.id}`} className='flex items-center gap-2 hover:opacity-80'>
              {ex.curator?.avatar_url ? (
                <img src={ex.curator.avatar_url} alt='' className='w-7 h-7 rounded-full object-cover' />
              ) : (
                <div style={{ background: '#26215C', color: '#AFA9EC' }}
                  className='w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium'>
                  {ex.curator?.display_name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>{ex.curator?.display_name}</span>
            </Link>
            {ex.closes_at && (
              <span style={{ color: 'var(--text-muted)' }} className='text-xs ml-2'>
                · Closes {new Date(ex.closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Artworks grid */}
        {sorted.length === 0 ? (
          <div style={{ borderColor: 'var(--border)' }} className='border border-dashed rounded-xl p-20 text-center'>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>No artworks in this exhibition yet</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {sorted.map((item: any, idx: number) => {
              const work = item.artwork
              if (!work) return null
              return (
                <Link key={work.id} href={`/artworks/${work.id}`}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  className='border rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors block'>
                  <div style={{ background: 'var(--bg-hover)', aspectRatio: '4/3', overflow: 'hidden' }}>
                    {work.image_urls?.[0]
                      ? <img src={work.image_urls[0]} alt={work.title} className='w-full h-full object-cover' />
                      : <div className='w-full h-full flex items-center justify-center'>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{idx + 1}</span>
                        </div>}
                  </div>
                  <div className='p-4'>
                    <div style={{ color: 'var(--text-primary)' }} className='font-medium mb-1'>{work.title}</div>
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mb-2'>
                      {work.artist?.display_name}
                      {work.year && ` · ${work.year}`}
                      {work.medium && ` · ${work.medium}`}
                    </div>
                    {work.price_gbp && work.status === 'available' && (
                      <div style={{ color: 'var(--purple)' }} className='text-sm font-medium'>
                        <Price gbp={work.price_gbp} />
                      </div>
                    )}
                    {work.status === 'in_auction' && (
                      <span style={{ background: '#1a0808', borderColor: 'var(--red)', color: 'var(--red)' }}
                        className='text-xs border rounded-full px-2 py-0.5'>Live auction</span>
                    )}
                    {work.status === 'sold' && (
                      <span style={{ color: 'var(--text-muted)' }} className='text-xs'>Sold</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
