import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { NewExhibitionForm } from './NewExhibitionForm'

export default async function NewExhibitionPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('id, roles').eq('auth_user_id', user.id).single()
  if (!profile || !(profile as any).roles?.includes('curator')) redirect('/exhibitions')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-xl mx-auto px-6 py-10'>
        <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium mb-8'>
          New exhibition
        </h1>
        <NewExhibitionForm />
      </div>
    </div>
  )
}
