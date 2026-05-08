import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SiteNav } from '@/components/SiteNav'
import Link from 'next/link'

export default async function ExhibitionsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isCurator = false
  if (user) {
    const { data: p } = await supabase.from('profiles').select('roles').eq('auth_user_id', user.id).single()
    isCurator = (p as any)?.roles?.includes('curator') ?? false
  }

  const { data: exhibitions } = await supabase
    .from('exhibitions')
    .select('*, curator:profiles(id, display_name, avatar_url)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  const list = (exhibitions ?? []) as any[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />

      <div className='max-w-5xl mx-auto px-6 py-10'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium'>Exhibitions</h1>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mt-1'>
              Curated shows from the ArtUNDERGROUND community
            </p>
          </div>
          {isCurator && (
            <Link href='/exhibitions/new'
              style={{ background: 'var(--purple)', fontSize: '13px' }}
              className='text-white px-4 py-2 rounded-lg font-medium hover:opacity-90'>
              + New exhibition
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <div className='text-center py-24'>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm'>No exhibitions yet</p>
            {isCurator && (
              <Link href='/exhibitions/new'
                style={{ color: 'var(--purple)' }}
                className='text-sm mt-3 block hover:opacity-80'>
                Create the first one →
              </Link>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
            {list.map((ex: any) => (
              <Link key={ex.id} href={`/exhibitions/${ex.id}`}
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                className='border rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors block'>

                {/* Banner placeholder */}
                <div style={{ background: 'linear-gradient(135deg, #1a1933 0%, #26215C 100%)', height: '120px' }}
                  className='flex items-center justify-center'>
                  <span style={{ color: 'var(--purple)', fontSize: '11px', letterSpacing: '0.1em' }}>EXHIBITION</span>
                </div>

                <div className='p-4'>
                  <h2 style={{ color: 'var(--text-primary)' }} className='font-medium mb-1 line-clamp-2'>{ex.title}</h2>
                  {ex.statement && (
                    <p style={{ color: 'var(--text-secondary)' }} className='text-xs line-clamp-2 mb-3'>{ex.statement}</p>
                  )}
                  <div className='flex items-center gap-2'>
                    {ex.curator?.avatar_url ? (
                      <img src={ex.curator.avatar_url} alt=''
                        className='w-5 h-5 rounded-full object-cover' />
                    ) : (
                      <div style={{ background: '#26215C', color: '#AFA9EC' }}
                        className='w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium'>
                        {ex.curator?.display_name?.slice(0, 1)}
                      </div>
                    )}
                    <span style={{ color: 'var(--text-muted)' }} className='text-xs'>{ex.curator?.display_name}</span>
                  </div>
                  {ex.closes_at && new Date(ex.closes_at) > new Date() && (
                    <div style={{ color: 'var(--text-muted)' }} className='text-xs mt-2'>
                      Closes {new Date(ex.closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
