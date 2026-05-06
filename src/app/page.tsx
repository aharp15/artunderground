import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/SiteNav'
import { LiveAuctionBanner } from '@/components/LiveAuctionBanner'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createServerSupabaseClient()

  const [artworksRes, liveAuctionsRes, artistsRes] = await Promise.all([
    supabase
      .from('artworks')
      .select('*, artist:profiles(id, display_name, location), auction:auctions(id, current_bid_gbp, bid_count, closes_at, status)')
      .in('status', ['listed', 'in_auction'])
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('auctions')
      .select('*, artwork:artworks(id, title, image_urls), seller:profiles(display_name)')
      .eq('status', 'live')
      .order('closes_at', { ascending: true })
      .limit(1),
    supabase
      .from('profiles')
      .select('id, display_name, location, bio, roles')
      .contains('roles', ['artist'])
      .limit(3),
  ])

  const artworks    = artworksRes.data    ?? []
  const liveAuction = liveAuctionsRes.data?.[0] ?? null
  const artists     = artistsRes.data     ?? []

  const totalArtworks = artworks.length
  const liveCount     = artworks.filter((a: any) => a.status === 'in_auction').length

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='discover' />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        {/* Hero band */}
        <div style={{ background: 'linear-gradient(135deg, #1a1933 0%, #0d1a2e 100%)', borderColor: 'var(--border)', borderRadius: '16px', padding: '32px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 500, lineHeight: 1.3, maxWidth: '340px' }}>
              Where art finds its audience — and its price
            </h1>
            <p style={{ color: 'var(--purple)', fontSize: '13px', marginTop: '8px' }}>
              Artists. Collectors. Curators. All in one space.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <Link href='/auth'
                style={{ background: 'var(--purple)', color: 'white', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>
                Show my work
              </Link>
              <Link href='/auctions'
                style={{ background: 'transparent', color: 'var(--purple)', padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, border: '1.5px solid var(--purple)' }}>
                Explore auctions
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end' }}>
            {[
              { num: artists.length + '00+', label: 'Artists' },
              { num: liveCount > 0 ? liveCount + '' : '—', label: 'Live auctions' },
              { num: totalArtworks + '', label: 'Works listed' },
            ].map(({ num, label }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)' }}>{num}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live auction banner */}
        {liveAuction && (
          <div id='auctions'>
            <LiveAuctionBanner auction={liveAuction} />
          </div>
        )}

        {/* Featured works */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>Featured works</h2>
            <Link href='/auctions' style={{ color: 'var(--purple)', fontSize: '12px' }}>See all</Link>
          </div>

          {artworks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>art</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>No works listed yet</div>
              <p style={{ fontSize: '13px', marginBottom: '20px' }}>Be the first artist to list a work.</p>
              <Link href='/auth'
                style={{ background: 'var(--purple)', color: 'white', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>
                Join as an artist
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              {artworks.map((work: any) => (
                <Link href={'/artworks/' + work.id} key={work.id}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px', border: '0.5px solid', overflow: 'hidden', display: 'block', textDecoration: 'none' }}
                  className='hover:border-purple-500 transition-colors group'>
                  <div style={{ height: '140px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {work.image_urls?.[0]
                      ? <img src={work.image_urls[0]} alt={work.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          className='group-hover:scale-105 transition-transform duration-300' />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '28px' }}>art</span>}
                    {work.status === 'in_auction' && (
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#FAECE7', color: '#993C1D', fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px' }}>
                        Live bid
                      </div>
                    )}
                    {work.status === 'listed' && (
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#EAF3DE', color: '#3B6D11', fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px' }}>
                        New
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {work.title}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      {work.artist?.display_name}
                    </div>
                    <div style={{ color: work.status === 'in_auction' ? '#7F77DD' : 'var(--purple)', fontSize: '12px', fontWeight: 500, marginTop: '6px' }}>
                      {work.auction?.current_bid_gbp
                        ? 'GBP ' + Number(work.auction.current_bid_gbp).toLocaleString()
                        : work.price_gbp
                        ? 'GBP ' + Number(work.price_gbp).toLocaleString()
                        : 'POA'}
                    </div>
                    {work.auction?.bid_count > 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
                        {work.auction.bid_count} bid{work.auction.bid_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Artists to follow */}
        {artists.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>Artists to follow</h2>
              <Link href='/artists' style={{ color: 'var(--purple)', fontSize: '12px' }}>Browse all</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
              {artists.map((artist: any) => (
                <Link key={artist.id} href={'/artists/' + artist.id}
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', border: '0.5px solid', borderRadius: '12px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start', textDecoration: 'none' }}
                  className='hover:border-purple-500 transition-colors'>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#26215C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, color: '#AFA9EC', flexShrink: 0 }}>
                    {artist.display_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{artist.display_name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{artist.location ?? 'ArtUNDERGROUND'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '5px' }}>
                      {artworks.filter((w: any) => w.artist?.id === artist.id).length} works listed
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', border: '0.5px solid var(--purple)', color: 'var(--purple)', background: 'none', borderRadius: '100px', padding: '3px 10px', whiteSpace: 'nowrap' }}>
                    View →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
