import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import Link from 'next/link'

export default async function MessagesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) redirect('/onboarding')

  const { data: convs } = await supabase
    .from('conversations')
    .select(`
      id, participant_a, participant_b, last_message_at,
      profile_a:profiles!participant_a(id, display_name, avatar_url),
      profile_b:profiles!participant_b(id, display_name, avatar_url),
      artwork:artworks(id, title, image_urls)
    `)
    .or(`participant_a.eq.${profile.id},participant_b.eq.${profile.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const convIds = (convs ?? []).map((c: any) => c.id)

  let msgMap = new Map<string, { preview: string; unread: number }>()

  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_id, read')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    for (const msg of msgs ?? []) {
      if (!msgMap.has(msg.conversation_id)) {
        msgMap.set(msg.conversation_id, { preview: msg.content.slice(0, 80), unread: 0 })
      }
      if (!msg.read && msg.sender_id !== profile.id) {
        msgMap.get(msg.conversation_id)!.unread++
      }
    }
  }

  const conversations = (convs ?? []).map((c: any) => ({
    id:           c.id,
    other:        c.participant_a === profile.id ? c.profile_b : c.profile_a,
    artwork:      c.artwork ?? null,
    lastAt:       c.last_message_at,
    preview:      msgMap.get(c.id)?.preview ?? null,
    unread:       msgMap.get(c.id)?.unread ?? 0,
  }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav currentPage='messages' />

      <div className='max-w-2xl mx-auto px-6 py-10'>
        <div className='flex items-center justify-between mb-6'>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 500 }}>
            Messages
          </h1>
          {conversations.some(c => c.unread > 0) && (
            <span style={{ background: 'var(--purple)', color: 'white', borderRadius: '100px', padding: '2px 10px', fontSize: '12px', fontWeight: 500 }}>
              {conversations.reduce((s, c) => s + c.unread, 0)} unread
            </span>
          )}
        </div>

        {conversations.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '6px' }}>No messages yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Start a conversation from an artist profile or artwork page.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {conversations.map(conv => (
              <Link key={conv.id} href={'/messages/' + conv.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px',
                  background: conv.unread > 0 ? 'var(--bg-card)' : 'transparent',
                  border: '0.5px solid',
                  borderColor: conv.unread > 0 ? 'var(--border)' : 'transparent',
                }}
                className='hover:bg-[var(--bg-card)] hover:border-[var(--border)] transition-colors'>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 500, flexShrink: 0 }}>
                  {conv.other?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: conv.unread > 0 ? 600 : 400 }}>
                      {conv.other?.display_name ?? 'Unknown'}
                    </span>
                    {conv.lastAt && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>
                        {new Date(conv.lastAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{
                      color: conv.unread > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontSize: '13px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: conv.unread > 0 ? 500 : 400,
                    }}>
                      {conv.preview ?? (conv.artwork ? 'Re: ' + conv.artwork.title : 'No messages yet')}
                    </span>
                    {conv.unread > 0 && (
                      <span style={{ background: 'var(--purple)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
