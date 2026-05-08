import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE    = process.env.NEXT_PUBLIC_BASE_URL!

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, roles, stripe_account_id').eq('auth_user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!(profile as any).roles?.includes('artist')) {
    return NextResponse.json({ error: 'Only artists can connect Stripe' }, { status: 403 })
  }

  let accountId = (profile as any).stripe_account_id as string | null

  // Create account if not yet created
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' })
    accountId = account.id
    await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', (profile as any).id)
  }

  // Check if already fully onboarded
  const account = await stripe.accounts.retrieve(accountId)
  if (account.details_submitted) {
    return NextResponse.json({ already_connected: true })
  }

  const link = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: `${BASE}/settings?stripe_refresh=true`,
    return_url:  `${BASE}/settings?stripe_connected=true`,
    type:        'account_onboarding',
  })

  return NextResponse.json({ url: link.url })
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('stripe_account_id').eq('auth_user_id', user.id).single()

  const accountId = (profile as any)?.stripe_account_id
  if (!accountId) return NextResponse.json({ connected: false })

  const account = await stripe.accounts.retrieve(accountId)
  return NextResponse.json({
    connected:          account.details_submitted,
    charges_enabled:    account.charges_enabled,
    payouts_enabled:    account.payouts_enabled,
  })
}
