import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: auction } = await supabase
      .from('auctions').select('seller_id, status').eq('id', auctionId).single()
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    if ((auction as any).seller_id !== (profile as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if ((auction as any).status !== 'live') {
      return NextResponse.json({ error: 'Auction is not live' }, { status: 422 })
    }

    const admin = createServiceClient()
    const { error } = await admin
      .from('auctions')
      .update({ closes_at: new Date().toISOString() })
      .eq('id', auctionId)

    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('auction end PATCH error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
