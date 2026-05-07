import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BiddingPanel } from './BiddingPanel'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export default async function ArtworkPage({ params }: Props) {
  const { id }   = await params
  const supabase = await createServerSupabaseClient()

  const { data: artwork } = await supabase
    .from('artworks')
    .select('*, artist:profiles(id, display_name, avatar_url, location, bio), auction:auctions(*)')
    .eq('id', id)
    .single()

  if (!artwork) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const activeAuction: any = Array.isArray(artwork.auction)
    ? (artwork.auction as any[])[0] ?? null
    : (artwork.auction as any) ?? null

  return (
    <div className='min-h-screen bg-gray-50'>

      {/* Nav */}
      <nav className='bg-black h-14 flex items-center justify-between px-6 flex-shrink-0'>
        <Link href='/' className='text-white font-medium tracking-wide text-sm'>
          art<span className='text-purple-400'>UNDERGROUND</span>
        </Link>
        <div className='flex items-center gap-4'>
          <Link href='/' className='text-gray-400 text-sm hover:text-white'>
            Back to discover
          </Link>
          {user
            ? <Link href='/dashboard' className='text-gray-400 text-sm hover:text-white'>Dashboard</Link>
            : <Link href='/auth' className='bg-purple-500 text-white text-sm px-4 py-1.5 rounded-lg font-medium'>Sign in</Link>
          }
        </div>
      </nav>

      <div className='grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-[calc(100vh-56px)]'>

        {/* Left: artwork + details */}
        <div className='p-6 space-y-6 overflow-y-auto'>

          {/* Auction room banner */}
          {activeAuction?.id && (
            <Link
              href={`/auctions/${activeAuction.id}`}
              className='flex items-center justify-between p-3 rounded-xl hover:opacity-90 transition-opacity'
              style={{ background: '#1a0808', border: '0.5px solid #D85A30' }}
            >
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
                <span style={{ color: '#D85A30', fontSize: '13px', fontWeight: 500 }}>Live auction in progress</span>
              </div>
              <span style={{ color: '#D85A30', fontSize: '12px' }}>Enter auction room →</span>
            </Link>
          )}

          {/* Main image */}
          <div className='bg-gray-900 rounded-xl aspect-[4/3] flex items-center justify-center overflow-hidden'>
            {artwork.image_urls?.[0]
              ? <img src={artwork.image_urls[0]} alt={artwork.title} className='max-h-full max-w-full object-contain' />
              : <span className='text-gray-600 text-sm'>No image uploaded</span>
            }
          </div>

          {/* Extra images */}
          {artwork.image_urls?.length > 1 && (
            <div className='flex gap-2 overflow-x-auto'>
              {artwork.image_urls.map((url: string, i: number) => (
                <img key={i} src={url} alt={`View ${i + 1}`}
                  className='w-16 h-16 object-cover rounded-lg border-2 border-transparent hover:border-purple-400 cursor-pointer flex-shrink-0' />
              ))}
            </div>
          )}

          {/* Title + status */}
          <div className='flex items-start justify-between'>
            <div>
              <h1 className='text-2xl font-medium text-gray-900'>{artwork.title}</h1>
              <p className='text-gray-500 mt-1 text-sm'>
                {[artwork.medium, artwork.dimensions, artwork.year].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className={[
              'text-xs font-medium px-2.5 py-1 rounded-full mt-1',
              artwork.status === 'in_auction' ? 'bg-red-50 text-red-600' :
              artwork.status === 'listed'     ? 'bg-green-50 text-green-700' :
              artwork.status === 'sold'       ? 'bg-purple-50 text-purple-600' :
              'bg-gray-100 text-gray-500'
            ].join(' ')}>
              {artwork.status.replace('_', ' ')}
            </span>
          </div>

          {/* Artist strip */}
          <div className='flex items-center gap-3 py-4 border-t border-b border-gray-100'>
            <div className='w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-medium text-purple-700 flex-shrink-0'>
              {artwork.artist?.display_name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className='font-medium text-gray-900 text-sm'>{artwork.artist?.display_name}</div>
              <div className='text-xs text-gray-500 mt-0.5'>{artwork.artist?.location}</div>
            </div>
          </div>

          {/* Artist bio */}
          {artwork.artist?.bio && (
            <p className='text-sm text-gray-600 leading-relaxed'>{artwork.artist.bio}</p>
          )}

          {/* Specs grid */}
          <div className='grid grid-cols-2 gap-x-6 gap-y-3'>
            {[
              ['Medium',      artwork.medium],
              ['Dimensions',  artwork.dimensions],
              ['Year',        artwork.year],
              ['Condition',   'Excellent'],
              ['Certificate', 'Included'],
              ['Ships from',  artwork.artist?.location ?? 'UK'],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <div className='text-xs text-gray-400'>{label}</div>
                <div className='text-sm font-medium text-gray-800 mt-0.5'>{value}</div>
              </div>
            ))}
          </div>

          {/* Provenance */}
          {artwork.provenance?.length > 0 && (
            <div>
              <h3 className='font-medium text-gray-900 mb-3 text-sm'>Provenance</h3>
              <div className='space-y-3'>
                {(artwork.provenance as Array<{ type: string; description: string; date: string }>)
                  .map((event, i) => (
                    <div key={i} className='flex gap-3 text-sm'>
                      <div className='w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0' />
                      <div>
                        <div className='font-medium text-gray-800'>{event.description}</div>
                        <div className='text-xs text-gray-400 mt-0.5'>{event.date}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>

        {/* Right: bidding panel */}
        <div className='border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto'>
          <BiddingPanel artwork={artwork} initialAuction={artwork.auction ?? null} />
        </div>

      </div>
    </div>
  )
}
