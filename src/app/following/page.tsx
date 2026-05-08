import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { FollowButton } from '@/components/FollowButton'
import { Price } from '@/components/Price'
import Link from 'next/link'

export default async function FollowingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?redirect=/following')

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) redirect('/onboarding')

  const admin = createServiceClient()

  // Fetch all followed artists with recent artworks + live auction
  const { data: follows } = await admin
    .from('follows')
    .select(`
      created_at,
      artist:profiles!following_id(
        id, display_name, avatar_url, location, bio,
        artworks(id, title, image_urls, status, price_gbp, medium, created_at)
      )
    `)
    .eq('follower_id', (profile as any).id)
    .order('created_at', { ascending: false })

  const artists = ((follows ?? []) as any[]).map(f => f.artist).filter(Boolean)

  // Fetch follower counts for all followed artists
  const artistIds = artists.map((a: any) => a.id)
  let followerCounts: Record<string, number> = {}
  if (artistIds.length > 0) {
    const { data: counts } = await admin
      .from('follows')
      .select('following_id')
      .in('following_id', artistIds)
    if (counts) {
      counts.forEach((r: any) => {
        followerCounts[r.following_id] = (followerCounts[r.following_id] ?? 0) + 1
      })
    }
  }

  // Fetch live auctions for followed artists
  let liveAuctions: Record<string, any> = {}
  if (artistIds.length > 0) {
    const { data: aucs } = await admin
      .from('auctions')
      .select('id, seller_id, current_bid_gbp, closes_at')
      .in('seller_id', artistIds)
      .eq('status', 'live')
    if (aucs) {
      aucs.forEach((a: any) => { liveAuctions[a.seller_id] = a })
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='following' />

      <div className='max-w-5xl mx-auto px-6 py-10'>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '26px', fontWeight: 500, marginBottom: '6px' }}>
            Following
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {artists.length > 0
              ? `${artists.length} artist${artists.length !== 1 ? 's' : ''} you follow`
              : 'Artists you follow will appear here'}
          </p>
        </div>

        {artists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', color: 'var(--text-muted)' }}>—</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '6px' }}>
              Not following anyone yet
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Follow artists to get their updates here.
            </p>
            <Link href='/artists'
              style={{ background: 'var(--purple)', color: 'white', padding: '9px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: 500 }}>
              Browse artists
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {artists.map((artist: any) => {
              const recentWorks = [...(artist.artworks ?? [])]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 4)
              const liveAuction = liveAuctions[artist.id]
              const count       = followerCounts[artist.id] ?? 0

              return (
                <div key={artist.id} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: recentWorks.length > 0 ? '16px' : 0 }}>

                    {/* Artist info */}
                    <Link href={`/artists/${artist.id}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, flexShrink: 0 }}>
                        {artist.display_name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>
                          {artist.display_name}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                          {[artist.location, `${count} follower${count !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                        </div>
                        {liveAuction && (
                          <Link href={`/auctions/${liveAuction.id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '5px', background: '#1a0808', border: '0.5px solid var(--red)', borderRadius: '100px', padding: '2px 8px' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--red)' }} className='animate-pulse' />
                            <span style={{ color: 'var(--red)', fontSize: '10px', fontWeight: 500 }}>
                              Live · <Price gbp={liveAuction.current_bid_gbp ?? 0} />
                            </span>
                          </Link>
                        )}
                      </div>
                    </Link>

                    {/* Follow button */}
                    <FollowButton
                      artistId={artist.id}
                      initialIsFollowing={true}
                      initialCount={count}
                    />
                  </div>

                  {/* Recent works */}
                  {recentWorks.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {recentWorks.map((work: any) => (
                        <Link key={work.id} href={`/artworks/${work.id}`}
                          style={{ flex: 1, minWidth: 0, borderRadius: '10px', overflow: 'hidden', aspectRatio: '1', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {work.image_urls?.[0]
                            ? <img src={work.image_urls[0]} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>art</span>}
                          {work.price_gbp && (
                            <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,0.7)', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', color: 'white' }}>
                              <Price gbp={work.price_gbp} />
                            </div>
                          )}
                        </Link>
                      ))}
                      {/* Placeholder slots to keep grid consistent */}
                      {Array.from({ length: Math.max(0, 4 - recentWorks.length) }).map((_, i) => (
                        <div key={`ph-${i}`} style={{ flex: 1 }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
