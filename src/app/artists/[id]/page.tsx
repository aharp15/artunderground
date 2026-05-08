import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { StatusBadge } from '@/components/StatusBadge'
import { AuctionCountdown } from '@/components/AuctionCountdown'
import { MessageButton } from '@/components/MessageButton'
import { FollowButton } from '@/components/FollowButton'
import { Price } from '@/components/Price'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function ArtistProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  let currentProfileId: string | null = null
  if (user) {
    const { data: me } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
    currentProfileId = me?.id ?? null
  }

  const admin = createServiceClient()

  const [profileRes, artworksRes, auctionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, location, bio, roles, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('artworks')
      .select('id, title, image_urls, status, price_gbp, medium, year, auction:auctions(id, current_bid_gbp, bid_count, closes_at, status)')
      .eq('artist_id', id)
      .in('status', ['listed', 'in_auction', 'sold'])
      .order('created_at', { ascending: false }),
    supabase
      .from('auctions')
      .select(`
        id, current_bid_gbp, bid_count, closes_at, reserve_gbp, status,
        artwork:artwork_id (id, title, image_urls)
      `)
      .eq('seller_id', id)
      .eq('status', 'live')
      .order('closes_at', { ascending: true }),
  ])

  if (!profileRes.data) notFound()

  const artist       = profileRes.data as any
  const artworks     = (artworksRes.data  ?? []) as any[]
  const liveAuctions = (auctionsRes.data  ?? []) as any[]

  const listedCount    = artworks.filter((a: any) => a.status === 'listed').length
  const inAuctionCount = artworks.filter((a: any) => a.status === 'in_auction').length
  const soldCount      = artworks.filter((a: any) => a.status === 'sold').length

  const memberSince = new Date(artist.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Follower count + whether current user follows this artist
  const { count: followerCount } = await admin
    .from('follows').select('id', { count: 'exact', head: true })
    .eq('following_id', id)

  let isFollowing = false
  if (currentProfileId && currentProfileId !== artist.id) {
    const { data: followRow } = await admin
      .from('follows').select('id')
      .eq('follower_id', currentProfileId).eq('following_id', id)
      .maybeSingle()
    isFollowing = !!followRow
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='artists' />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link href='/artists' style={{ color: 'var(--text-muted)' }} className='hover:text-gray-400'>
            Artists
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{artist.display_name}</span>
        </div>

        {/* Artist header card */}
        <div style={{
          background: 'var(--bg-card)', border: '0.5px solid var(--border)',
          borderRadius: '16px', padding: '28px', marginBottom: '28px',
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: '#26215C', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '22px', fontWeight: 500,
              color: '#AFA9EC', flexShrink: 0,
            }}>
              {artist.display_name?.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 500, marginBottom: '4px' }}>
                {artist.display_name}
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                {artist.location && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {artist.location}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Member since {memberSince}
                </span>
              </div>

              {artist.bio && (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.65, maxWidth: '600px', marginBottom: '20px' }}>
                  {artist.bio}
                </p>
              )}

              {/* Stats row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Listed',     value: listedCount },
                  { label: 'In auction', value: inAuctionCount },
                  { label: 'Sold',       value: soldCount },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 500 }}>{value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
                {currentProfileId && currentProfileId !== artist.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FollowButton
                      artistId={artist.id}
                      initialIsFollowing={isFollowing}
                      initialCount={followerCount ?? 0}
                    />
                    <MessageButton otherProfileId={artist.id} label='Message' />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live auctions */}
        {liveAuctions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div
                style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D85A30' }}
                className='animate-pulse'
              />
              <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>Live auctions</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveAuctions.map((auc: any) => (
                <Link
                  key={auc.id}
                  href={'/artworks/' + auc.artwork?.id}
                  style={{
                    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
                    borderRadius: '12px', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none',
                  }}
                  className='hover:border-purple-500 transition-colors'
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '48px', height: '48px', background: 'var(--bg-secondary)',
                    borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {auc.artwork?.image_urls?.[0]
                      ? <img src={auc.artwork.image_urls[0]} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>art</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {auc.artwork?.title ?? 'Untitled'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                      {auc.bid_count ?? 0} bid{(auc.bid_count ?? 0) !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#1D9E75', fontSize: '14px', fontWeight: 500 }}>
                      {auc.current_bid_gbp
                        ? <Price gbp={auc.current_bid_gbp} />
                        : 'No bids'}
                    </div>
                    <AuctionCountdown closesAt={auc.closes_at} />
                  </div>

                  <span style={{ color: 'var(--purple)', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Bid now →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Works grid */}
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, marginBottom: '14px' }}>
            Works
          </h2>

          {artworks.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--bg-card)', border: '0.5px solid var(--border)',
              borderRadius: '16px',
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No works listed yet.</div>
            </div>
          ) : (
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
              {artworks.map((work: any) => (
                <Link
                  key={work.id}
                  href={'/artworks/' + work.id}
                  style={{
                    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
                    borderRadius: '12px', overflow: 'hidden',
                    display: 'block', textDecoration: 'none',
                  }}
                  className='hover:border-purple-500 transition-colors group'
                >
                  <div style={{ height: '140px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {work.image_urls?.[0]
                      ? <img
                          src={work.image_urls[0]}
                          alt={work.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          className='group-hover:scale-105 transition-transform duration-300'
                        />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '24px' }}>art</span>}
                  </div>

                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {work.title}
                    </div>
                    {(work.medium || work.year) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
                        {[work.medium, work.year].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <StatusBadge status={work.status} />
                      <span style={{ color: 'var(--purple)', fontSize: '11px', fontWeight: 500 }}>
                        {work.auction?.current_bid_gbp
                          ? <Price gbp={work.auction.current_bid_gbp} />
                          : work.price_gbp
                          ? <Price gbp={work.price_gbp} />
                          : 'POA'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
