import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/SiteNav'
import { Price } from '@/components/Price'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [artworksRes, liveAuctionsRes, artistsRes, exhibitionsRes, statsRes] = await Promise.all([
    supabase
      .from('artworks')
      .select('*, artist:profiles(id, display_name, avatar_url), auction:auctions(id, current_bid_gbp, bid_count, closes_at, status)')
      .in('status', ['listed', 'in_auction'])
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('auctions')
      .select('*, artwork:artworks(id, title, image_urls), seller:profiles(id, display_name, avatar_url)')
      .eq('status', 'live')
      .order('closes_at', { ascending: true })
      .limit(3),
    supabase
      .from('profiles')
      .select('id, display_name, location, bio, avatar_url, roles')
      .contains('roles', ['artist'])
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('exhibitions')
      .select('id, title, statement, curator:profiles(id, display_name, avatar_url)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).contains('roles', ['artist']),
  ])

  const artworks    = (artworksRes.data    ?? []) as any[]
  const liveAuctions = (liveAuctionsRes.data ?? []) as any[]
  const artists     = (artistsRes.data     ?? []) as any[]
  const exhibitions = (exhibitionsRes.data ?? []) as any[]
  const artistCount = statsRes.count ?? 0

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='discover' />

      <div className='max-w-5xl mx-auto px-6 py-10 space-y-12'>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(135deg, #1a1933 0%, #0d1117 100%)',
          borderColor: 'var(--border)', borderRadius: '20px', border: '0.5px solid',
          padding: '48px 40px',
        }}>
          <div className='flex flex-wrap gap-8 items-center justify-between'>
            <div style={{ maxWidth: '420px' }}>
              <div style={{ color: 'var(--purple)', fontSize: '11px', letterSpacing: '0.15em', marginBottom: '14px' }}>
                THE UNDERGROUND MARKETPLACE
              </div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 500, lineHeight: 1.25, marginBottom: '14px' }}>
                Where art finds its audience — and its price
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                Live auctions, curated exhibitions and direct sales. Artists, collectors and curators in one space.
              </p>
              <div className='flex flex-wrap gap-3'>
                {!user && (
                  <Link href='/auth'
                    style={{ background: 'var(--purple)', color: 'white', padding: '10px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 500 }}
                    className='hover:opacity-90 transition-opacity'>
                    Join free
                  </Link>
                )}
                <Link href='/auctions'
                  style={{ background: 'transparent', color: 'var(--text-primary)', padding: '10px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, border: '0.5px solid var(--border)' }}
                  className='hover:border-purple-500 transition-colors'>
                  Live auctions →
                </Link>
              </div>
            </div>
            <div className='flex gap-8'>
              {[
                { value: artistCount > 0 ? `${artistCount}` : '—', label: 'Artists' },
                { value: liveAuctions.length > 0 ? `${liveAuctions.length}` : '—', label: 'Live now' },
                { value: artworks.length > 0 ? `${artworks.length}+` : '—', label: 'Works listed' },
              ].map(s => (
                <div key={s.label} className='text-center'>
                  <div style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 600 }}>{s.value}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '3px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live auctions ────────────────────────────────────────────────── */}
        {liveAuctions.length > 0 && (
          <section>
            <div className='flex items-center justify-between mb-5'>
              <div className='flex items-center gap-2'>
                <div style={{ width: '8px', height: '8px', background: 'var(--red)', borderRadius: '50%' }} className='animate-pulse' />
                <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>Live auctions</h2>
              </div>
              <Link href='/auctions' style={{ color: 'var(--purple)', fontSize: '12px' }} className='hover:opacity-80'>
                View all →
              </Link>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              {liveAuctions.map((auc: any) => {
                const diff     = new Date(auc.closes_at).getTime() - Date.now()
                const hrs      = Math.floor(diff / 3_600_000)
                const mins     = Math.floor((diff % 3_600_000) / 60_000)
                const timeLeft = diff > 0 ? (hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m left`) : 'Ending'
                return (
                  <Link key={auc.id} href={`/auctions/${auc.id}`}
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    className='border rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors block group'>
                    <div style={{ background: 'var(--bg-hover)', aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
                      {auc.artwork?.image_urls?.[0]
                        ? <img src={auc.artwork.image_urls[0]} alt={auc.artwork.title}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300' />
                        : <div className='w-full h-full' />}
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#1a0808cc', borderColor: 'var(--red)', color: 'var(--red)', fontSize: '10px', fontWeight: 500 }}
                        className='border rounded-full px-2 py-0.5'>
                        {timeLeft}
                      </div>
                    </div>
                    <div className='p-4'>
                      <div style={{ color: 'var(--text-primary)' }} className='font-medium text-sm truncate'>{auc.artwork?.title}</div>
                      <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5'>{auc.seller?.display_name}</div>
                      <div className='flex items-center justify-between mt-3'>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Current bid</div>
                          <div style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '15px' }}>
                            <Price gbp={auc.current_bid_gbp ?? auc.reserve_gbp ?? 0} />
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {auc.bid_count ?? 0} bid{auc.bid_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Featured works ───────────────────────────────────────────────── */}
        {artworks.length > 0 && (
          <section>
            <div className='flex items-center justify-between mb-5'>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>Featured works</h2>
              <Link href='/artworks' style={{ color: 'var(--purple)', fontSize: '12px' }} className='hover:opacity-80'>
                Browse all →
              </Link>
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
              {artworks.map((work: any) => (
                <Link key={work.id} href={`/artworks/${work.id}`}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  className='border rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors block group'>
                  <div style={{ background: 'var(--bg-hover)', aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                    {work.image_urls?.[0]
                      ? <img src={work.image_urls[0]} alt={work.title}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300' />
                      : <div className='w-full h-full' />}
                    {work.status === 'in_auction' && (
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#FAECE7dd', color: '#993C1D', fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px' }}>
                        Live bid
                      </div>
                    )}
                  </div>
                  <div className='p-3'>
                    <div style={{ color: 'var(--text-primary)' }} className='text-xs font-medium truncate'>{work.title}</div>
                    <div className='flex items-center gap-1.5 mt-1'>
                      {work.artist?.avatar_url ? (
                        <img src={work.artist.avatar_url} alt='' className='w-4 h-4 rounded-full object-cover' />
                      ) : (
                        <div style={{ background: '#26215C', color: '#AFA9EC', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 600 }}>
                          {work.artist?.display_name?.slice(0, 1)}
                        </div>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }} className='truncate'>
                        {work.artist?.display_name}
                      </span>
                    </div>
                    <div style={{ color: 'var(--purple)', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                      {work.auction?.current_bid_gbp
                        ? <Price gbp={work.auction.current_bid_gbp} />
                        : work.price_gbp
                        ? <Price gbp={work.price_gbp} />
                        : <span style={{ color: 'var(--text-muted)' }}>POA</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Exhibitions ──────────────────────────────────────────────────── */}
        {exhibitions.length > 0 && (
          <section>
            <div className='flex items-center justify-between mb-5'>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>Exhibitions</h2>
              <Link href='/exhibitions' style={{ color: 'var(--purple)', fontSize: '12px' }} className='hover:opacity-80'>
                View all →
              </Link>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              {exhibitions.map((ex: any) => (
                <Link key={ex.id} href={`/exhibitions/${ex.id}`}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  className='border rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors block'>
                  <div style={{ background: 'linear-gradient(135deg,#1a1933 0%,#26215C 100%)', height: '100px' }}
                    className='flex items-center justify-center'>
                    <span style={{ color: 'var(--purple)', fontSize: '10px', letterSpacing: '0.12em' }}>EXHIBITION</span>
                  </div>
                  <div className='p-4'>
                    <div style={{ color: 'var(--text-primary)' }} className='font-medium text-sm mb-1 line-clamp-1'>{ex.title}</div>
                    {ex.statement && (
                      <p style={{ color: 'var(--text-secondary)' }} className='text-xs line-clamp-2 mb-3'>{ex.statement}</p>
                    )}
                    <div className='flex items-center gap-2'>
                      {ex.curator?.avatar_url ? (
                        <img src={ex.curator.avatar_url} alt='' className='w-5 h-5 rounded-full object-cover' />
                      ) : (
                        <div style={{ background: '#26215C', color: '#AFA9EC' }}
                          className='w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium'>
                          {ex.curator?.display_name?.slice(0, 1)}
                        </div>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{ex.curator?.display_name}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Artists ──────────────────────────────────────────────────────── */}
        {artists.length > 0 && (
          <section>
            <div className='flex items-center justify-between mb-5'>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>Artists to follow</h2>
              <Link href='/artists' style={{ color: 'var(--purple)', fontSize: '12px' }} className='hover:opacity-80'>
                Browse all →
              </Link>
            </div>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              {artists.map((artist: any) => (
                <Link key={artist.id} href={`/artists/${artist.id}`}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  className='border rounded-xl p-4 hover:border-purple-500/50 transition-colors block text-center'>
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt=''
                      className='w-14 h-14 rounded-full object-cover mx-auto mb-3' />
                  ) : (
                    <div style={{ background: '#26215C', color: '#AFA9EC' }}
                      className='w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium mx-auto mb-3'>
                      {artist.display_name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium truncate'>{artist.display_name}</div>
                  {artist.location && (
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5 truncate'>{artist.location}</div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state for fresh installs ──────────────────────────────── */}
        {artworks.length === 0 && liveAuctions.length === 0 && (
          <div className='text-center py-20'>
            <div style={{ color: 'var(--text-muted)', fontSize: '40px', marginBottom: '16px' }}>art</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
              Nothing listed yet
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Be the first artist to list a work.
            </p>
            <Link href='/auth'
              style={{ background: 'var(--purple)', color: 'white', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 500 }}
              className='hover:opacity-90 transition-opacity'>
              Join as an artist
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
