import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { AuctionInvitePanel } from './AuctionInvitePanel'
import { AuctionStreamClient, AuctionBidClient } from './AuctionRoomClient'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function AuctionPage({ params }: Props) {
  const { id: auctionId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: auction } = await supabase
    .from('auctions')
    .select(`
      id, status, visibility, reserve_gbp, current_bid_gbp, bid_count,
      opens_at, closes_at, seller_id, stream_active,
      artwork:artworks(id, title, medium, dimensions, year, image_urls,
        artist:profiles!artist_id(id, display_name, location, avatar_url)
      ),
      seller:profiles!seller_id(id, display_name)
    `)
    .eq('id', auctionId)
    .single()

  if (!auction) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let profile: { id: string } | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
    profile = data
  }

  const a = auction as any

  const isSeller  = !!(profile && a.seller_id === profile.id)
  const isPrivate = a.visibility === 'private'

  let invite: any = null
  if (profile && isPrivate && !isSeller) {
    const { data } = await supabase
      .from('auction_invites')
      .select('id, status')
      .eq('auction_id', auctionId)
      .eq('invitee_id', profile.id)
      .single()
    invite = data
  }

  const canBid    = !isPrivate || isSeller || invite?.status === 'accepted'
  const diff      = new Date(a.closes_at).getTime() - Date.now()
  const isLive    = a.status === 'live' && diff > 0
  const canStream = profile && (isSeller || canBid)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='auctions' />

      <div className='max-w-5xl mx-auto px-6 py-10'>
        <div className='grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start'>

          {/* ── Left: stream + artwork ─────────────────── */}
          <div className='space-y-6'>

            {/* Stream (host or viewer) — client-side only */}
            {canStream && a.status !== 'sold' && (
              <AuctionStreamClient
                auctionId={auctionId}
                isHost={isSeller}
                initialStreamActive={a.stream_active ?? false}
              />
            )}

            {/* Artwork image */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {a.artwork?.image_urls?.[0]
                ? <img src={a.artwork.image_urls[0]} alt={a.artwork.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                : <span style={{ color: 'var(--text-muted)' }}>No image</span>}
            </div>

            {a.artwork?.image_urls?.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {a.artwork.image_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`View ${i + 1}`}
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '0.5px solid var(--border)' }} />
                ))}
              </div>
            )}

            <div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 500, marginBottom: '4px' }}>
                {a.artwork?.title ?? 'Untitled'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {[a.artwork?.medium, a.artwork?.dimensions, a.artwork?.year].filter(Boolean).join(' · ')}
              </p>
            </div>

            {a.artwork?.artist && (
              <Link href={'/artists/' + a.artwork.artist.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>
                  {a.artwork.artist.display_name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
                    {a.artwork.artist.display_name}
                  </div>
                  {a.artwork.artist.location && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{a.artwork.artist.location}</div>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* ── Right: bid / invite panel ──────────────── */}
          <div>

            {/* Private + not invited */}
            {isPrivate && !canBid && (
              <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔒</div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
                  Private auction
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>
                  You need an invitation to bid.
                </p>
                {invite?.status === 'pending' && (
                  <div style={{ marginTop: '16px', background: '#1a1933', border: '0.5px solid var(--purple)', borderRadius: '8px', padding: '10px 14px' }}>
                    <p style={{ color: 'var(--purple)', fontSize: '13px' }}>
                      Pending invitation — check notifications to accept.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Seller: invite management */}
            {isSeller && (
              <div style={{ marginBottom: '16px' }}>
                <AuctionInvitePanel auctionId={auctionId} visibility={a.visibility ?? 'public'} />
              </div>
            )}

            {/* Bid panel — sellers see it read-only, invited bidders see form */}
            {(canBid || isSeller) && (
              <AuctionBidClient
                auctionId={auctionId}
                initialCurrentBid={a.current_bid_gbp ?? null}
                initialReserve={a.reserve_gbp}
                initialBidCount={a.bid_count ?? 0}
                isLive={isLive}
                isPrivate={isPrivate && !!invite}
                isSeller={isSeller}
                closesAt={a.closes_at}
                status={a.status}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
