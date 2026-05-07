'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  auctionId: string
  isHost: boolean
  initialStreamActive: boolean
}

function HostInner({ auctionId, onEnd }: { auctionId: string; onEnd: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false })
  const camTrack = tracks.find(t => t.participant.identity === localParticipant.identity)

  async function endStream() {
    await fetch(`/api/auctions/${auctionId}/stream`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: false }),
    })
    onEnd()
  }

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
      {camTrack
        ? <VideoTrack trackRef={camTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '13px' }}>
            Camera starting…
          </div>
      }
      <div style={{ position: 'absolute', top: 12, left: 12, background: '#D85A30', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.06em' }}>
        LIVE
      </div>
      <button
        onClick={endStream}
        style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer' }}
      >
        End stream
      </button>
    </div>
  )
}

function ViewerInner() {
  const tracks  = useTracks([Track.Source.Camera], { onlySubscribed: true })
  const hostTrack = tracks[0]

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
      {hostTrack
        ? <>
            <VideoTrack trackRef={hostTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <RoomAudioRenderer />
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#D85A30', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.06em' }}>
              LIVE
            </div>
          </>
        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '13px' }}>
            Waiting for host video…
          </div>
      }
    </div>
  )
}

export function AuctionStream({ auctionId, isHost, initialStreamActive }: Props) {
  const [streamActive, setStreamActive] = useState(initialStreamActive)
  const [token,        setToken]        = useState<string | null>(null)
  const [lkUrl,        setLkUrl]        = useState<string | null>(null)
  const [busy,         setBusy]         = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const fetchingRef = useRef(false)

  // Viewers only: watch Supabase Realtime for stream_active changes
  useEffect(() => {
    if (isHost) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const ch = supabase
      .channel(`stream-watch:${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        payload => {
          const next = (payload.new as any).stream_active
          if (typeof next === 'boolean') setStreamActive(next)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [auctionId, isHost])

  // Viewers only: fetch token when stream goes live, drop when it ends
  useEffect(() => {
    if (isHost) return
    if (streamActive && !token && !fetchingRef.current) {
      fetchingRef.current = true
      fetch(`/api/auctions/${auctionId}/stream`, { method: 'POST' })
        .then(r => r.json())
        .then(d => { setToken(d.token); setLkUrl(d.url) })
        .catch(() => setError('Could not connect to stream'))
        .finally(() => { fetchingRef.current = false })
    }
    if (!streamActive) setToken(null)
  }, [streamActive, isHost, auctionId]) // token intentionally omitted — read via ref

  async function goLive() {
    setBusy(true)
    setError(null)
    try {
      const [tokenData] = await Promise.all([
        fetch(`/api/auctions/${auctionId}/stream`, { method: 'POST' }).then(r => r.json()),
        fetch(`/api/auctions/${auctionId}/stream`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ active: true }),
        }),
      ])
      if (tokenData.error) throw new Error(tokenData.error)
      setToken(tokenData.token)
      setLkUrl(tokenData.url)
      setStreamActive(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function handleDisconnect() {
    setToken(null)
    setStreamActive(false)
  }

  // ── Host: pre-live ───────────────────────────────────────
  if (isHost && !token) {
    return (
      <div style={{ marginBottom: '20px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px', aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>You're the seller — go live when ready</p>
        <button
          onClick={goLive}
          disabled={busy}
          style={{ background: '#D85A30', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 28px', fontSize: '14px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
        >
          {busy ? 'Connecting…' : '● Go Live'}
        </button>
        {error && <span style={{ color: 'var(--red)', fontSize: '12px' }}>{error}</span>}
      </div>
    )
  }

  // ── Viewer: waiting for stream ───────────────────────────
  if (!isHost && !streamActive) {
    return (
      <div style={{ marginBottom: '20px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px', aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Waiting for host to go live</p>
      </div>
    )
  }

  // ── Connected ────────────────────────────────────────────
  if (token && lkUrl) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <LiveKitRoom
          serverUrl={lkUrl}
          token={token}
          video={isHost}
          audio={isHost}
          connect={true}
          onDisconnected={handleDisconnect}
        >
          {isHost
            ? <HostInner auctionId={auctionId} onEnd={handleDisconnect} />
            : <ViewerInner />
          }
        </LiveKitRoom>
      </div>
    )
  }

  // ── Fetching token ───────────────────────────────────────
  return (
    <div style={{ marginBottom: '20px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Connecting to stream…</p>
    </div>
  )
}
