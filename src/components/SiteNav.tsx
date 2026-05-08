import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function SiteNav({ currentPage }: { currentPage?: string }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { id: string; display_name: string; roles: string[] } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, roles')
      .eq('auth_user_id', user.id)
      .single()
    profile = data
  }

  const isArtist = profile?.roles?.includes('artist')

  let unreadMessages = 0
  if (profile) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .neq('sender_id', profile.id)
    unreadMessages = count ?? 0
  }

  return (
    <nav style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)' }}
      className='h-14 flex items-center justify-between px-6 flex-shrink-0'>

      <div className='flex items-center gap-6'>
        <Link href='/' className='text-white font-medium tracking-widest text-sm shrink-0'>
          art<span style={{ color: 'var(--purple)' }}>UNDERGROUND</span>
        </Link>
        <div className='hidden sm:flex items-center gap-5'>
          {[
            { href: '/',          label: 'Discover',   page: 'discover'   },
            { href: '/auctions',  label: 'Auctions',   page: 'auctions'   },
            { href: '/artists',   label: 'Artists',    page: 'artists'    },
            ...(user ? [{ href: '/following', label: 'Following', page: 'following' }] : []),
          ].map(({ href, label, page }) => (
            <Link key={page} href={href} style={{
              color: currentPage === page ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
            }}
              className='hover:text-white transition-colors'>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className='flex items-center gap-4'>
        {user && isArtist && (
          <Link href='/portfolio/upload'
            style={{ color: 'var(--text-secondary)', fontSize: '13px' }}
            className='hover:text-white transition-colors'>
            + Upload
          </Link>
        )}
        {user && (
          <Link href='/messages'
            style={{ position: 'relative', color: currentPage === 'messages' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px' }}
            className='hover:text-white transition-colors'>
            Messages
            {unreadMessages > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-10px',
                background: 'var(--purple)', color: 'white',
                borderRadius: '50%', width: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: 600,
              }}>
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </Link>
        )}
        {user ? (
          <>
            <Link href='/dashboard' className='flex items-center gap-2 hover:opacity-80'>
              <div style={{ background: '#26215C', color: '#AFA9EC' }}
                className='w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium'>
                {profile?.display_name?.slice(0, 2).toUpperCase() ?? 'AU'}
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }} className='hidden sm:block'>
                {profile?.display_name?.split(' ')[0]}
              </span>
            </Link>
            <form action='/auth/signout' method='POST'>
              <button style={{ color: 'var(--text-muted)', fontSize: '12px' }}
                className='hover:text-gray-400 transition-colors'>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href='/auth'
              style={{ color: 'var(--text-secondary)', fontSize: '13px' }}
              className='hover:text-white transition-colors'>
              Sign in
            </Link>
            <Link href='/auth'
              style={{ background: 'var(--purple)', fontSize: '13px' }}
              className='text-white px-4 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity'>
              Join
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
