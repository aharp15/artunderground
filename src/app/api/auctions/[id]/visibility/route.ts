import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({ visibility: z.enum(['public', 'private']) })

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: auction } = await supabase
      .from('auctions').select('seller_id').eq('id', auctionId).single()
    if (!auction || (auction as any).seller_id !== (profile as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 })
    }

    const admin = createServiceClient()
    const { error } = await admin
      .from('auctions')
      .update({ visibility: parsed.data.visibility })
      .eq('id', auctionId)

    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({ visibility: parsed.data.visibility })

  } catch (err: any) {
    console.error('Visibility PATCH error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
