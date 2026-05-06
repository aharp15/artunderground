import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export async function AuthButton() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className='flex gap-2 items-center'>
        <Link href='/auth' className='text-gray-400 text-sm hover:text-white'>
          Sign in
        </Link>
        <Link href='/auth?mode=signup' className='bg-purple-500 text-white text-sm px-4 py-1.5 rounded-lg font-medium hover:bg-purple-600'>
          Join
        </Link>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, roles, avatar_url')
    .eq('auth_user_id', user.id)
    .single()

  return (
    <div className='flex gap-3 items-center'>
      {profile?.roles?.includes('artist') && (
        <Link href='/portfolio/upload' className='text-gray-400 text-sm hover:text-white'>
          + Upload
        </Link>
      )}
      <Link href='/dashboard' className='flex items-center gap-2 hover:opacity-80'>
        <div className='w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-medium text-purple-200'>
          {profile?.display_name?.slice(0, 2).toUpperCase() ?? 'AU'}
        </div>
        <span className='text-gray-300 text-sm hidden sm:block'>
          {profile?.display_name?.split(' ')[0]}
        </span>
      </Link>
      <form action='/auth/signout' method='POST'>
        <button type='submit' className='text-gray-600 text-xs hover:text-gray-400'>
          Sign out
        </button>
      </form>
    </div>
  )
}
