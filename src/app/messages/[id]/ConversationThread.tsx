'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Participant {
  id: string
  display_name: string
  avatar_url: string | null
}

interface MsgWithSender {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
  sender?: Participant | null
}

interface Props {
  conversationId: string
  currentProfileId: string
  other: Participant
  initialMessages: MsgWithSender[]
  artworkContext: { id: string; title: string; image_urls: string[] } | null
}

export function ConversationThread({
  conversationId,
  currentProfileId,
  other,
  initialMessages,
  artworkContext,
}: Props) {
  const [messages, setMessages] = useState<MsgWithSender[]>(initialMessages)
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Mark messages as read on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', currentProfileId)
      .then(() => {})
  }, [conversationId, currentProfileId])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('messages:' + conversationId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MsgWithSender
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            // Mark as read if it's from the other person
            if (newMsg.sender_id !== currentProfileId) {
              supabase.from('messages').update({ read: true }).eq('id', newMsg.id).then(() => {})
            }
            return [...prev, { ...newMsg, sender: newMsg.sender_id === currentProfileId ? null : other }]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentProfileId, other])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput('')

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      setInput(content) // restore on failure
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function initials(name: string) {
    return name?.slice(0, 2).toUpperCase() ?? '??'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Header */}
      <div style={{ borderBottom: '0.5px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <Link href='/messages' style={{ color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1 }}>
          ←
        </Link>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#26215C', color: '#AFA9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>
          {initials(other.display_name)}
        </div>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
            {other.display_name}
          </div>
          {artworkContext && (
            <Link href={'/artworks/' + artworkContext.id}
              style={{ color: 'var(--text-muted)', fontSize: '11px' }}
              className='hover:underline'>
              Re: {artworkContext.title}
            </Link>
          )}
        </div>
      </div>

      {/* Artwork context card */}
      {artworkContext && (
        <Link href={'/artworks/' + artworkContext.id}
          style={{ margin: '12px 20px 0', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '10px 12px', flexShrink: 0 }}>
          {artworkContext.image_urls?.[0] && (
            <img src={artworkContext.image_urls[0]} alt='' style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
          )}
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Regarding</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{artworkContext.title}</div>
          </div>
        </Link>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
            Start the conversation
          </p>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === currentProfileId
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '70%',
                padding: '10px 14px',
                borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMine ? 'var(--purple)' : 'var(--bg-card)',
                border: isMine ? 'none' : '0.5px solid var(--border)',
                color: isMine ? 'white' : 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: '1.5',
                wordBreak: 'break-word',
              }}>
                {msg.content}
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '14px 20px', display: 'flex', gap: '10px', flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Write a message...'
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '10px 14px', borderRadius: '12px',
            border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.5',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '10px 18px', borderRadius: '12px', background: 'var(--purple)',
            color: 'white', fontSize: '13px', fontWeight: 500,
            opacity: sending || !input.trim() ? 0.5 : 1,
            cursor: sending || !input.trim() ? 'default' : 'pointer',
          }}>
          Send
        </button>
      </div>
    </div>
  )
}
