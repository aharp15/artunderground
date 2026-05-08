import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { NotificationsClient } from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) redirect('/onboarding')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', (profile as any).id)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-2xl mx-auto px-6 py-10'>
        <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium mb-8'>Notifications</h1>
        <NotificationsClient initial={(notifications ?? []) as any} />
      </div>
    </div>
  )
}
