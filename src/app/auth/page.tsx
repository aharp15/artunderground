'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/dashboard'

  const [mode,     setMode]     = useState<Mode>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [message,  setMessage]  = useState<string | null>(null)
  const supabase = createClient()

  async function handleSignIn() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message)
      setLoading(false); return
    }
    router.push(next); router.refresh()
  }

  async function handleSignUp() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Check your email to confirm your account, then sign in.')
    setMode('signin'); setLoading(false)
  }

  async function handleForgot() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback?next=/auth/reset',
    })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Password reset link sent - check your email.'); setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'signin') handleSignIn()
    if (mode === 'signup') handleSignUp()
    if (mode === 'forgot') handleForgot()
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: '0.5px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: '14px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} className='flex flex-col'>
      <nav style={{ borderBottom: '0.5px solid var(--border)' }} className='h-14 flex items-center justify-between px-6'>
        <Link href='/' className='text-white font-medium tracking-widest text-sm'>
          art<span style={{ color: 'var(--purple)' }}>UNDERGROUND</span>
        </Link>
      </nav>

      <div className='flex-1 flex items-center justify-center px-4 py-12'>
        <div className='w-full max-w-sm'>

          <div className='text-center mb-8'>
            <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium'>
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }} className='text-sm mt-2'>
              {mode === 'signin' ? 'Welcome back to ArtUNDERGROUND' : ''}
              {mode === 'signup' ? 'Join artists, collectors and curators' : ''}
              {mode === 'forgot' ? 'Enter your email for a reset link' : ''}
            </p>
          </div>

          {message && (
            <div style={{ background: '#0a1f18', borderColor: 'var(--green)', color: 'var(--green)' }}
              className='border rounded-xl px-4 py-3 text-sm text-center mb-5'>
              {message}
            </div>
          )}
          {error && (
            <div style={{ background: '#1a0808', borderColor: 'var(--red)', color: 'var(--red)' }}
              className='border rounded-xl px-4 py-3 text-sm text-center mb-5'>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-3'>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)}
              placeholder='Email address' required style={inputStyle} />
            {mode !== 'forgot' && (
              <input type='password' value={password} onChange={e => setPassword(e.target.value)}
                placeholder='Password' required minLength={8} style={inputStyle} />
            )}
            <button type='submit' disabled={loading}
              style={{ width: '100%', background: 'var(--purple)', padding: '12px', borderRadius: '12px', color: 'white', fontWeight: 500, fontSize: '14px', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          <div className='mt-5 space-y-3 text-center'>
            {mode === 'signin' && <>
              <button onClick={() => { setMode('forgot'); setError(null) }}
                style={{ color: 'var(--text-muted)', fontSize: '12px' }}
                className='hover:text-gray-400'>
                Forgot your password?
              </button>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                No account?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }}
                  style={{ color: 'var(--purple)' }} className='hover:opacity-80'>
                  Join ArtUNDERGROUND
                </button>
              </div>
            </>}
            {mode === 'signup' && (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Already a member?{' '}
                <button onClick={() => { setMode('signin'); setError(null) }}
                  style={{ color: 'var(--purple)' }} className='hover:opacity-80'>
                  Sign in
                </button>
              </div>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('signin'); setError(null) }}
                style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Back to sign in
              </button>
            )}
          </div>

          {mode === 'signin' && process.env.NODE_ENV === 'development' && (
            <div style={{ borderColor: 'var(--border)' }} className='mt-8 pt-6 border-t'>
              <p style={{ color: 'var(--text-muted)' }} className='text-xs text-center mb-3'>
                Test accounts
              </p>
              <div className='space-y-1.5'>
                {[
                  ['Artist',    'yara@artunderground.test'],
                  ['Collector', 'collector@artunderground.test'],
                  ['Curator',   'curator@artunderground.test'],
                ].map(([role, addr]) => (
                  <button key={addr}
                    onClick={() => { setEmail(addr); setPassword('Password123!') }}
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                    className='w-full border flex items-center justify-between px-3 py-2 rounded-lg hover:border-purple-500 transition-colors'>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{role}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{addr}</span>
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)' }} className='text-xs text-center mt-2'>
                Click to autofill
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
