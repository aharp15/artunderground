import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const uuidLike = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const CreateConvSchema = z.object({
  other_profile_id: uuidLike,
  artwork_id:       uuidLike.nullable().optional(),
})

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select(`
        id, participant_a, participant_b, last_message_at, created_at,
        profile_a:profiles!participant_a(id, display_name, avatar_url),
        profile_b:profiles!participant_b(id, display_name, avatar_url),
        artwork:artworks(id, title, image_urls)
      `)
      .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (convError) {
      console.error('Conversations fetch error:', convError.message)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!convs || convs.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const convIds = convs.map(c => c.id)
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at, sender_id, read')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const msgMap = new Map<string, { last: any; unread: number }>()
    for (const msg of msgs ?? []) {
      if (!msgMap.has(msg.conversation_id)) {
        msgMap.set(msg.conversation_id, { last: msg, unread: 0 })
      }
      if (!msg.read && msg.sender_id !== profile.id) {
        msgMap.get(msg.conversation_id)!.unread++
      }
    }

    const conversations = convs.map((conv: any) => ({
      id:                    conv.id,
      other_participant:     conv.participant_a === profile.id ? conv.profile_b : conv.profile_a,
      artwork:               conv.artwork ?? null,
      last_message_at:       conv.last_message_at,
      last_message_preview:  msgMap.get(conv.id)?.last?.content?.slice(0, 80) ?? null,
      unread_count:          msgMap.get(conv.id)?.unread ?? 0,
    }))

    return NextResponse.json({ conversations })

  } catch (err: any) {
    console.error('Conversations GET error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

    const parsed = CreateConvSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    if (parsed.data.other_profile_id === profile.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    const { data: conversationId, error: rpcError } = await supabase.rpc(
      'get_or_create_conversation',
      {
        p_other_profile_id: parsed.data.other_profile_id,
        p_artwork_id:       parsed.data.artwork_id ?? null,
      }
    )

    if (rpcError) {
      console.error('get_or_create_conversation error:', rpcError.message)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation_id: conversationId }, { status: 201 })

  } catch (err: any) {
    console.error('Conversations POST error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
