import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { ExhibitionEditor } from './ExhibitionEditor'

interface Props { params: Promise<{ id: string }> }

export default async function EditExhibitionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('id, roles').eq('auth_user_id', user.id).single()
  if (!profile || !(profile as any).roles?.includes('curator')) redirect('/exhibitions')

  const { data: exhibition } = await supabase
    .from('exhibitions')
    .select(`*, artworks:exhibition_artworks(position, artwork:artworks(id, title, image_urls, status))`)
    .eq('id', id)
    .single()

  if (!exhibition || (exhibition as any).curator_id !== (profile as any).id) notFound()

  // Curator's artworks to add
  const { data: myArtworks } = await supabase
    .from('artworks')
    .select('id, title, image_urls, status')
    .eq('artist_id', (profile as any).id)
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <h1 style={{ color: 'var(--text-primary)' }} className='text-2xl font-medium mb-8'>
          Edit exhibition
        </h1>
        <ExhibitionEditor
          exhibition={exhibition as any}
          myArtworks={(myArtworks ?? []) as any}
        />
      </div>
    </div>
  )
}
