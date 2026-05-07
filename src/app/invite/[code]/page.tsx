import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'

interface Props { params: Promise<{ code: string }> }

export default async function InviteRedemptionPage({ params }: Props) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth?redirect=/invite/${code}`)
  }

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) {
    return <ErrorPage message='Profile not found. Please complete your profile setup.' />
  }

  const admin = createServiceClient()

  const { data: auction } = await admin
    .from('auctions')
    .select('id, status, visibility, invite_code, artwork:artworks(title)')
    .eq('invite_code', code)
    .single()

  if (!auction) {
    return <ErrorPage message='This invite link is invalid or has been revoked.' />
  }

  if ((auction as any).status === 'sold') {
    return <ErrorPage message='This auction has already ended.' />
  }

  // Check for existing invite
  const { data: existing } = await admin
    .from('auction_invites')
    .select('id, status')
    .eq('auction_id', auction.id)
    .eq('invitee_id', profile.id)
    .single()

  if (existing) {
    // Already invited — upgrade pending to accepted
    if (existing.status === 'pending') {
      await admin
        .from('auction_invites')
        .update({ status: 'accepted' })
        .eq('id', existing.id)
    }
    redirect(`/auctions/${auction.id}`)
  }

  // Create accepted invite
  await admin.from('auction_invites').insert({
    auction_id:  auction.id,
    invitee_id:  profile.id,
    invited_by:  profile.id,
    status:      'accepted',
  })

  redirect(`/auctions/${auction.id}`)
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='auctions' />
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '40px 32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>
            Invite not valid
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
            {message}
          </p>
          <a href='/auctions' style={{ display: 'inline-block', marginTop: '24px', padding: '9px 20px', background: 'var(--purple)', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
            Browse auctions
          </a>
        </div>
      </div>
    </div>
  )
}
