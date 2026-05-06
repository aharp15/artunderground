import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import { CreateAuctionButton } from '@/components/CreateAuctionButton'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('auth_user_id', user.id).single()
  if (!profile) redirect('/onboarding')

  const isArtist    = profile.roles.includes('artist')
  const isCollector = profile.roles.includes('collector')

  const [artworksRes, auctionsRes, watchingRes, notificationsRes] = await Promise.all([
    isArtist
      ? supabase.from('artworks')
          .select('*, auction:auctions(id, current_bid_gbp, bid_count, closes_at, status)')
          .eq('artist_id', profile.id).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    isArtist
      ? supabase.from('auctions')
          .select('*, artwork:artworks(id, title, image_urls)')
          .eq('seller_id', profile.id).in('status', ['live', 'scheduled'])
          .order('closes_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    isCollector
      ? supabase.from('bids')
          .select('*, auction:auctions(id, status, closes_at, current_bid_gbp, artwork:artworks(id, title, image_urls, price_gbp))')
          .eq('bidder_id', profile.id).eq('is_winning', true)
          .order('placed_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    supabase.from('notifications').select('*').eq('user_id', profile.id)
      .eq('read', false).order('created_at', { ascending: false }).limit(5),
  ])

  const artworks      = (artworksRes.data      ?? []) as any[]
  const auctions      = (auctionsRes.data      ?? []) as any[]
  const watching      = (watchingRes.data      ?? []) as any[]
  const notifications = (notificationsRes.data ?? []) as any[]

  let totalEarned = 0
  if (isArtist) {
    const { data: txns } = await supabase.from('transactions')
      .select('sale_price_gbp, commission_gbp').eq('seller_id', profile.id).eq('status', 'completed')
    totalEarned = (txns ?? []).reduce((s: number, t: any) => s + (t.sale_price_gbp - t.commission_gbp), 0)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />

      <div className='max-w-5xl mx-auto px-6 py-10 space-y-8'>

        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium'>
              Welcome back, {profile.display_name.split(' ')[0]}
            </h1>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mt-1'>
              {profile.location && profile.location + ' · '}
              {profile.roles.map((r: string) => r.charAt(0).toUpperCase() + r.slice(1)).join(' & ')}
            </p>
          </div>
          {notifications.length > 0 && (
            <div style={{ background: '#1a1933', borderColor: 'var(--purple)', color: 'var(--purple)' }}
              className='border rounded-xl px-4 py-2 text-sm font-medium'>
              {notifications.length} new notification{notifications.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Artist metrics */}
        {isArtist && (
          <div className='grid grid-cols-4 gap-4'>
            {[
              { label: 'Works',         value: artworks.length },
              { label: 'Live auctions', value: auctions.filter((a: any) => a.status === 'live').length },
              { label: 'Total earned',  value: totalEarned > 0 ? 'GBP ' + totalEarned.toLocaleString() : 'GBP 0' },
              { label: 'Active bids',   value: auctions.reduce((s: number, a: any) => s + (a.bid_count ?? 0), 0) },
            ].map(m => (
              <div key={m.label}
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                className='border rounded-xl p-4'>
                <div style={{ color: 'var(--text-muted)' }} className='text-xs mb-1'>{m.label}</div>
                <div style={{ color: 'var(--text-primary)' }} className='text-xl font-medium'>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live auctions */}
        {isArtist && auctions.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
            <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-4'>Live auctions</h2>
            <div className='space-y-3'>
              {auctions.map((auc: any) => {
                const diff   = new Date(auc.closes_at).getTime() - Date.now()
                const hrs    = Math.floor(diff / 3600000)
                const mins   = Math.floor((diff % 3600000) / 60000)
                const timeLeft = diff > 0 ? `${hrs}h ${mins}m remaining` : 'Ended'
                return (
                  <div key={auc.id}
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    className='border rounded-lg flex items-center gap-4 p-3'>
                    <div style={{ background: 'var(--bg-hover)' }}
                      className='w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0'>
                      {auc.artwork?.image_urls?.[0]
                        ? <img src={auc.artwork.image_urls[0]} alt='' className='w-full h-full object-cover' />
                        : <span style={{ color: 'var(--text-muted)' }} className='text-xs'>art</span>}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div style={{ color: 'var(--text-primary)' }} className='font-medium text-sm truncate'>
                        {auc.artwork?.title}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5'>{timeLeft}</div>
                    </div>
                    <div className='text-right'>
                      <div style={{ color: 'var(--purple)' }} className='font-medium text-sm'>
                        GBP {(auc.current_bid_gbp ?? auc.reserve_gbp ?? 0).toLocaleString()}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }} className='text-xs'>{auc.bid_count ?? 0} bids</div>
                    </div>
                    <Link href={'/artworks/' + auc.artwork_id}
                      style={{ color: 'var(--purple)', fontSize: '12px' }}
                      className='hover:opacity-80 font-medium whitespace-nowrap'>
                      View lot
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {isArtist && (
          <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
            <div className='flex items-center justify-between mb-4'>
              <h2 style={{ color: 'var(--text-primary)' }} className='font-medium'>My works</h2>
              <Link href='/portfolio/upload'
                style={{ color: 'var(--purple)', fontSize: '13px' }}
                className='hover:opacity-80'>
                + Upload new
              </Link>
            </div>
            {artworks.length === 0 ? (
              <div className='text-center py-8'>
                <p style={{ color: 'var(--text-muted)' }} className='text-sm mb-4'>No works yet</p>
                <Link href='/portfolio/upload'
                  style={{ background: 'var(--purple)' }}
                  className='text-white px-5 py-2 rounded-lg text-sm font-medium'>
                  Upload your first work
                </Link>
              </div>
            ) : (
              <div className='grid grid-cols-4 gap-3'>
                {artworks.map((work: any) => (
                  <div key={work.id}
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    className='border rounded-lg overflow-hidden'>
                    <Link href={'/artworks/' + work.id}>
                      <div style={{ background: 'var(--bg-hover)' }}
                        className='h-24 flex items-center justify-center overflow-hidden'>
                        {work.image_urls?.[0]
                          ? <img src={work.image_urls[0]} alt={work.title} className='w-full h-full object-cover' />
                          : <span style={{ color: 'var(--text-muted)' }} className='text-xs'>art</span>}
                      </div>
                    </Link>
                    <div className='p-2.5'>
                      <div style={{ color: 'var(--text-primary)' }} className='text-xs font-medium truncate'>
                        {work.title}
                      </div>
                      <div className='flex items-center justify-between mt-2 gap-1'>
                        <StatusBadge status={work.status} />
                        {work.status === 'listed' && (
                          <CreateAuctionButton artworkId={work.id} artworkTitle={work.title} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collector bids */}
        {isCollector && watching.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
            <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-4'>Active bids</h2>
            <div className='space-y-3'>
              {watching.map((bid: any) => {
                const auc     = bid.auction
                const artwork = auc?.artwork
                const isWinning = bid.is_winning
                return (
                  <Link href={'/artworks/' + artwork?.id} key={bid.id}
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    className='border rounded-lg flex items-center gap-4 p-3 hover:border-purple-500 transition-colors'>
                    <div style={{ background: 'var(--bg-hover)' }}
                      className='w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center'>
                      {artwork?.image_urls?.[0]
                        ? <img src={artwork.image_urls[0]} alt='' className='w-full h-full object-cover' />
                        : <span style={{ color: 'var(--text-muted)' }} className='text-xs'>art</span>}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div style={{ color: 'var(--text-primary)' }} className='font-medium text-sm truncate'>
                        {artwork?.title}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5'>
                        Your bid: GBP {bid.amount_gbp?.toLocaleString()}
                      </div>
                    </div>
                    <span style={isWinning
                      ? { color: '#1D9E75', background: '#0a1f18', borderColor: '#1D9E75' }
                      : { color: '#D85A30', background: '#1a0a08', borderColor: '#D85A30' }}
                      className='text-xs font-medium px-2 py-0.5 rounded-full border'>
                      {isWinning ? 'Winning' : 'Outbid'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} className='border rounded-xl p-5'>
            <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-4'>Notifications</h2>
            <div className='space-y-3'>
              {notifications.map((n: any) => (
                <div key={n.id} style={{ background: 'var(--bg-secondary)' }}
                  className='flex items-start gap-3 p-3 rounded-lg'>
                  <div style={{ background: 'var(--purple)', width: '6px', height: '6px' }}
                    className='rounded-full mt-2 flex-shrink-0' />
                  <div>
                    <div style={{ color: 'var(--text-primary)' }} className='text-sm font-medium'>
                      {n.type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-0.5'>
                      {new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
