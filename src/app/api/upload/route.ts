import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the artist profile id (used as folder name in storage)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, roles')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !profile.roles.includes('artist')) {
    return NextResponse.json({ error: 'Only artists can upload images' }, { status: 403 })
  }

  // Parse the multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPEG, PNG or WebP.' },
      { status: 400 }
    )
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 }
    )
  }

  // Build storage path: {profile_id}/{timestamp}_{filename}
  const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const path      = `${profile.id}/${filename}`

  // Convert File to ArrayBuffer for Supabase upload
  const buffer = await file.arrayBuffer()

  const { data, error: uploadError } = await supabase.storage
    .from('artworks')
    .upload(path, buffer, {
      contentType:  file.type,
      cacheControl: '3600',
      upsert:       false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('artworks')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl, path: data.path })
}
