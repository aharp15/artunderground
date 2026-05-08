import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, bio, location, avatar_url, roles')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-xl mx-auto px-6 py-10'>
        <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium mb-8'>
          Profile settings
        </h1>
        <SettingsForm profile={profile as any} />
      </div>
    </div>
  )
}
