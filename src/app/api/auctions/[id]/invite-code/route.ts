import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

type RouteParams = { params: Promise<{ id: string }> }

function generateCode(): string {
  // 8 chars from unambiguous set — no 0/O/I/1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(randomBytes(8))
    .map(b => chars[b % chars.length])
    .join('')
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: auction } = await supabase
      .from('auctions').select('seller_id, invite_code').eq('id', auctionId).single()
    if (!auction || (auction as any).seller_id !== (profile as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ code: (auction as any).invite_code ?? null })

  } catch (err: any) {
    console.error('invite-code GET error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id: auctionId } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: auction } = await supabase
      .from('auctions').select('seller_id, invite_code').eq('id', auctionId).single()
    if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    if ((auction as any).seller_id !== (profile as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return existing code if present
    if ((auction as any).invite_code) {
      return NextResponse.json({ code: (auction as any).invite_code })
    }

    // Generate a unique code (retry on collision)
    const admin = createServiceClient()
    let code = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode()
      const { error } = await admin
        .from('auctions')
        .update({ invite_code: code })
        .eq('id', auctionId)
      if (!error) break
      code = ''
    }

    if (!code) return NextResponse.json({ error: 'Could not generate code' }, { status: 500 })

    return NextResponse.json({ code }, { status: 201 })

  } catch (err: any) {
    console.error('invite-code POST error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — revoke (generate a fresh code next time)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
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

    const admin = createServiceClient()
    await admin.from('auctions').update({ invite_code: null }).eq('id', auctionId)

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('invite-code DELETE error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
