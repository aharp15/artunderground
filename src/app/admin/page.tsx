import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('id, is_admin').eq('auth_user_id', user.id).single()
  if (!profile || !(profile as any).is_admin) redirect('/')

  const admin = createServiceClient()

  const [usersRes, artworksRes, transactionsRes] = await Promise.all([
    admin.from('profiles')
      .select('id, display_name, roles, location, created_at, is_admin')
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('artworks')
      .select('id, title, status, created_at, artist:profiles(id, display_name)')
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('transactions')
      .select('id, sale_price_gbp, commission_gbp, status, completed_at, artwork:artworks(id, title)')
      .order('completed_at', { ascending: false })
      .limit(20),
  ])

  const users        = (usersRes.data        ?? []) as any[]
  const artworks     = (artworksRes.data     ?? []) as any[]
  const transactions = (transactionsRes.data ?? []) as any[]

  const totalRevenue = transactions
    .filter((t: any) => t.status === 'completed')
    .reduce((s: number, t: any) => s + (t.commission_gbp ?? 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-6xl mx-auto px-6 py-10'>

        <div className='flex items-center gap-3 mb-8'>
          <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium'>Admin</h1>
          <span style={{ background: '#1a1933', borderColor: 'var(--purple)', color: 'var(--purple)' }}
            className='border rounded-full px-2.5 py-0.5 text-xs font-medium'>
            Internal
          </span>
        </div>

        {/* Metrics */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {[
            { label: 'Total users',     value: users.length       },
            { label: 'Total artworks',  value: artworks.length    },
            { label: 'Transactions',    value: transactions.length },
            { label: 'Platform revenue',value: `£${totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` },
          ].map(m => (
            <div key={m.label}
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              className='border rounded-xl p-4'>
              <div style={{ color: 'var(--text-muted)' }} className='text-xs mb-1'>{m.label}</div>
              <div style={{ color: 'var(--text-primary)' }} className='text-xl font-medium'>{m.value}</div>
            </div>
          ))}
        </div>

        <AdminClient users={users} artworks={artworks} transactions={transactions} />

      </div>
    </div>
  )
}
