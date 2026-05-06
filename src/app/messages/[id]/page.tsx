import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { ConversationThread } from './ConversationThread'

interface Props { params: Promise<{ id: string }> }

export default async function ConversationPage({ params }: Props) {
  const { id: conversationId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) redirect('/onboarding')

  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id, participant_a, participant_b, artwork_id,
      profile_a:profiles!participant_a(id, display_name, avatar_url),
      profile_b:profiles!participant_b(id, display_name, avatar_url),
      artwork:artworks(id, title, image_urls)
    `)
    .eq('id', conversationId)
    .single()

  if (!conv) notFound()

  const isParticipant = (conv as any).participant_a === profile.id || (conv as any).participant_b === profile.id
  if (!isParticipant) notFound()

  const other: any = (conv as any).participant_a === profile.id
    ? (conv as any).profile_b
    : (conv as any).profile_a

  const { data: messages } = await supabase
    .from('messages')
    .select(`
      id, conversation_id, sender_id, content, read, created_at,
      sender:profiles!sender_id(id, display_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='messages' />
      <ConversationThread
        conversationId={conversationId}
        currentProfileId={profile.id}
        other={other}
        initialMessages={messages ?? []}
        artworkContext={(conv as any).artwork ?? null}
      />
    </div>
  )
}
