import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG or WebP.' }, { status: 400 })
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Maximum 2MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${profile.id}/avatar.${ext}`
  const buffer = await file.arrayBuffer()

  const { data, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: true })

  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl })
}
