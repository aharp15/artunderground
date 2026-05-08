import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MobileMenu } from './MobileMenu'

export async function SiteNav({ currentPage }: { currentPage?: string }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { id: string; display_name: string; roles: string[]; avatar_url: string | null; is_admin: boolean } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, roles, avatar_url, is_admin')
      .eq('auth_user_id', user.id)
      .single()
    profile = data
  }

  const isArtist  = profile?.roles?.includes('artist')
  const isAdmin   = (profile as any)?.is_admin

  let unreadMessages = 0
  let unreadNotifications = 0
  if (profile) {
    const [msgRes, notifRes] = await Promise.all([
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('read', false).neq('sender_id', profile.id),
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id).eq('read', false),
    ])
    unreadMessages      = msgRes.count ?? 0
    unreadNotifications = notifRes.count ?? 0
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
            { href: '/',            label: 'Discover',    page: 'discover'    },
            { href: '/auctions',    label: 'Auctions',    page: 'auctions'    },
            { href: '/artists',     label: 'Artists',     page: 'artists'     },
            { href: '/exhibitions', label: 'Exhibitions', page: 'exhibitions' },
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
        {/* Search form */}
        <form action='/search' method='GET' className='hidden md:flex'>
          <div style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            className='border rounded-lg flex items-center gap-2 px-3 py-1.5'>
            <svg width='13' height='13' fill='none' viewBox='0 0 24 24' stroke='var(--text-muted)' strokeWidth='2.5'>
              <circle cx='11' cy='11' r='8' /><path d='m21 21-4.35-4.35' strokeLinecap='round' />
            </svg>
            <input name='q' placeholder='Search…'
              style={{ background: 'transparent', color: 'var(--text-primary)', outline: 'none', width: '140px', fontSize: '12px' }}
            />
          </div>
        </form>

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
        {user && (
          <Link href='/notifications'
            style={{ position: 'relative', color: currentPage === 'notifications' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            className='hover:text-white transition-colors flex items-center'>
            <svg width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'>
              <path strokeLinecap='round' d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
            </svg>
            {unreadNotifications > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-8px',
                background: 'var(--purple)', color: 'white',
                borderRadius: '50%', width: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: 600,
              }}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
        )}
        {/* Mobile hamburger */}
        <MobileMenu
          links={[
            { href: '/',           label: 'Discover'  },
            { href: '/auctions',   label: 'Auctions'  },
            { href: '/artists',    label: 'Artists'   },
            { href: '/exhibitions',label: 'Exhibitions'},
            ...(user ? [{ href: '/following', label: 'Following' }] : []),
          ]}
          isArtist={!!isArtist}
          isLoggedIn={!!user}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
        />

        {user ? (
          <>
            <Link href='/dashboard' className='flex items-center gap-2 hover:opacity-80'>
              {profile ? (
                profile.avatar_url ? (
                  <img src={profile.avatar_url} alt=''
                    className='w-7 h-7 rounded-full object-cover flex-shrink-0' />
                ) : (
                  <div style={{ background: '#26215C', color: '#AFA9EC' }}
                    className='w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0'>
                    {profile.display_name?.slice(0, 2).toUpperCase() ?? 'AU'}
                  </div>
                )
              ) : null}
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }} className='hidden sm:block'>
                {profile?.display_name?.split(' ')[0]}
              </span>
            </Link>
            <Link href='/settings'
              style={{ color: 'var(--text-muted)', fontSize: '12px' }}
              className='hover:text-gray-400 transition-colors hidden sm:block'>
              Settings
            </Link>
            {isAdmin && (
              <Link href='/admin'
                style={{ color: 'var(--purple)', fontSize: '12px' }}
                className='hover:opacity-80 transition-opacity hidden sm:block font-medium'>
                Admin
              </Link>
            )}
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
