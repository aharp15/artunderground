import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/SiteNav'
import { AuctionCountdown } from '@/components/AuctionCountdown'
import Link from 'next/link'

export default async function AuctionsPage() {
  const supabase = await createServerSupabaseClient()

  // Use explicit foreign key hints to avoid ambiguous relationship errors
  const { data: live, error: liveError } = await supabase
    .from('auctions')
    .select(`
      id, status, current_bid_gbp, bid_count, closes_at, opens_at, reserve_gbp,
      artwork:artwork_id (id, title, image_urls, medium, dimensions, year,
        artist:artist_id (display_name, location)
      ),
      seller:seller_id (display_name)
    `)
    .eq('status', 'live')
    .order('closes_at', { ascending: true })

  const { data: upcoming } = await supabase
    .from('auctions')
    .select(`
      id, status, opens_at, closes_at, reserve_gbp,
      artwork:artwork_id (id, title, image_urls,
        artist:artist_id (display_name)
      ),
      seller:seller_id (display_name)
    `)
    .eq('status', 'scheduled')
    .order('opens_at', { ascending: true })
    .limit(6)

  if (liveError) {
    console.error('Auctions page error:', liveError)
  }

  const liveAuctions    = (live     ?? []) as any[]
  const upcomingAuctions = (upcoming ?? []) as any[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='auctions' />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '26px', fontWeight: 500, marginBottom: '6px' }}>
            Auctions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {liveAuctions.length > 0
              ? liveAuctions.length + ' live auction' + (liveAuctions.length !== 1 ? 's' : '') + ' open for bidding now'
              : 'No live auctions right now — check back soon'}
          </p>
        </div>

        {/* Live auctions */}
        {liveAuctions.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D85A30' }}
                className='animate-pulse' />
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>Live now</h2>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-[14px]'>
              {liveAuctions.map((auc: any) => (
                <div key={auc.id}
                  style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}
                  className='hover:border-purple-500 transition-colors'>

                  <div style={{ height: '200px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {auc.artwork?.image_urls?.[0]
                      ? <img src={auc.artwork.image_urls[0]} alt={auc.artwork.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '36px' }}>art</span>}
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', borderRadius: '100px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D85A30' }}
                        className='animate-pulse' />
                      <span style={{ color: '#fff', fontSize: '11px', fontWeight: 500 }}>LIVE</span>
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                      {auc.artwork?.title ?? 'Untitled'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                      {auc.artwork?.artist?.display_name ?? auc.seller?.display_name}
                      {auc.artwork?.medium ? ' · ' + auc.artwork.medium : ''}
                    </div>

                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div style={{ flex: 1, padding: '8px 10px', borderRight: '0.5px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Current bid</div>
                        <div style={{ color: '#1D9E75', fontSize: '14px', fontWeight: 500, marginTop: '2px' }}>
                          {auc.current_bid_gbp
                            ? 'GBP ' + Number(auc.current_bid_gbp).toLocaleString()
                            : 'No bids'}
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: '8px 10px', borderRight: '0.5px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Bids</div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginTop: '2px' }}>
                          {auc.bid_count ?? 0}
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Time left</div>
                        <AuctionCountdown closesAt={auc.closes_at} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', color: (auc.current_bid_gbp ?? 0) >= auc.reserve_gbp ? '#1D9E75' : 'var(--text-muted)' }}>
                        {(auc.current_bid_gbp ?? 0) >= auc.reserve_gbp ? '✓ Reserve met' : 'Reserve not yet met'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Reserve GBP {Number(auc.reserve_gbp).toLocaleString()}
                      </span>
                    </div>

                    <Link href={'/auctions/' + auc.id}
                      style={{ display: 'block', textAlign: 'center', background: 'var(--purple)', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}
                      className='hover:opacity-90 transition-opacity active:scale-[0.98]'>
                      Enter auction room →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {liveAuctions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', marginBottom: '28px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--text-muted)' }}>art</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>No live auctions right now</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Artists can start an auction from their dashboard.
            </p>
            <Link href='/dashboard'
              style={{ background: 'var(--purple)', color: 'white', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>
              Start an auction
            </Link>
          </div>
        )}

        {upcomingAuctions.length > 0 && (
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginBottom: '14px' }}>Upcoming</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingAuctions.map((auc: any) => (
                <Link key={auc.id} href={'/auctions/' + auc.id}
                  style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
                  className='hover:border-purple-500 transition-colors'>
                  <div style={{ width: '44px', height: '44px', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {auc.artwork?.image_urls?.[0]
                      ? <img src={auc.artwork.image_urls[0]} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>art</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {auc.artwork?.title ?? 'Untitled'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      {auc.artwork?.artist?.display_name} · Opens {new Date(auc.opens_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>GBP {Number(auc.reserve_gbp).toLocaleString()}+</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>Upcoming</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
