import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

type RouteParams = { params: Promise<{ id: string }> }

async function getParticipantProfile(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase
    .from('profiles').select('id, display_name').eq('auth_user_id', user.id).single()
  return profile
}

async function verifyParticipant(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  conversationId: string,
  profileId: string
) {
  const { data } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .single()
  if (!data) return null
  if (data.participant_a !== profileId && data.participant_b !== profileId) return null
  return data
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params
    const supabase = await createServerSupabaseClient()

    const profile = await getParticipantProfile(supabase)
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conv = await verifyParticipant(supabase, conversationId, profile.id)
    if (!conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const before = searchParams.get('before')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

    let query = supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, content, read, created_at,
        sender:profiles!sender_id(id, display_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query
    if (error) {
      console.error('Messages fetch error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: (messages ?? []).reverse() })

  } catch (err: any) {
    console.error('Messages GET error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params
    const supabase = await createServerSupabaseClient()

    const profile = await getParticipantProfile(supabase)
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conv = await verifyParticipant(supabase, conversationId, profile.id)
    if (!conv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let body: unknown
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

    const parsed = SendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e: any) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: profile.id, content: parsed.data.content })
      .select()
      .single()

    if (msgError) {
      console.error('Message insert error:', msgError.message)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    const recipientId = conv.participant_a === profile.id ? conv.participant_b : conv.participant_a

    await supabase.from('notifications').insert({
      user_id: recipientId,
      type:    'new_message',
      payload: {
        conversation_id: conversationId,
        sender_name:     profile.display_name,
        preview:         parsed.data.content.slice(0, 100),
      },
    })

    return NextResponse.json({ message }, { status: 201 })

  } catch (err: any) {
    console.error('Messages POST error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
