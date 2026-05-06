'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router              = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className='min-h-screen bg-black flex items-center justify-center px-4'>
      <div className='w-full max-w-sm'>
        <h1 className='text-white text-2xl font-medium text-center mb-2'>Set new password</h1>
        <p className='text-gray-500 text-sm text-center mb-8'>Choose a strong password for your account.</p>

        {error && (
          <div className='bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300 text-center mb-5'>
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className='space-y-3'>
          <input
            type='password' value={password} onChange={e => setPassword(e.target.value)}
            placeholder='New password' required minLength={8}
            className='w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500'
          />
          <input
            type='password' value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder='Confirm password' required
            className='w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500'
          />
          <button
            type='submit' disabled={loading}
            className='w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm'
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
