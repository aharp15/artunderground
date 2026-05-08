import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SettingsForm } from './SettingsForm'
import { StripeConnectPanel } from './StripeConnectPanel'

interface Props { searchParams: Promise<{ stripe_connected?: string; stripe_refresh?: string }> }

export default async function SettingsPage({ searchParams }: Props) {
  const { stripe_connected, stripe_refresh } = await searchParams
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, bio, location, avatar_url, roles, stripe_account_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const isArtist = (profile as any).roles?.includes('artist')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-xl mx-auto px-6 py-10'>
        <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium mb-8'>
          Profile settings
        </h1>
        <SettingsForm profile={profile as any} />
        {isArtist && (
          <div className='mt-6'>
            <StripeConnectPanel
              stripeAccountId={(profile as any).stripe_account_id ?? null}
              justConnected={stripe_connected === 'true'}
              needsRefresh={stripe_refresh === 'true'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
