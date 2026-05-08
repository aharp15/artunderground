import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

async function getProfileId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('id').eq('auth_user_id', userId).single()
  return (data as any)?.id ?? null
}

// GET /api/follows?following_id=xxx — check follow status + follower count
export async function GET(request: NextRequest) {
  const followingId = request.nextUrl.searchParams.get('following_id')
  if (!followingId) return NextResponse.json({ error: 'following_id required' }, { status: 400 })

  const admin = createServiceClient()
  const { count: followerCount } = await admin
    .from('follows').select('id', { count: 'exact', head: true })
    .eq('following_id', followingId)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ isFollowing: false, followerCount: followerCount ?? 0 })

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) return NextResponse.json({ isFollowing: false, followerCount: followerCount ?? 0 })

  const { data } = await supabase
    .from('follows').select('id')
    .eq('follower_id', profileId).eq('following_id', followingId)
    .maybeSingle()

  return NextResponse.json({ isFollowing: !!data, followerCount: followerCount ?? 0 })
}

// POST /api/follows — follow an artist
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { following_id } = await request.json()
  if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })
  if (following_id === profileId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 422 })

  const admin = createServiceClient()
  const { error } = await admin.from('follows').insert({ follower_id: profileId, following_id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true }) // already following
    return NextResponse.json({ error: 'Follow failed' }, { status: 500 })
  }

  // Notify the artist
  await admin.from('notifications').insert({
    user_id: following_id,
    type:    'new_follower',
    payload: { follower_id: profileId },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}

// DELETE /api/follows?following_id=xxx — unfollow
export async function DELETE(request: NextRequest) {
  const followingId = request.nextUrl.searchParams.get('following_id')
  if (!followingId) return NextResponse.json({ error: 'following_id required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileId = await getProfileId(supabase, user.id)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const admin = createServiceClient()
  await admin.from('follows')
    .delete()
    .eq('follower_id', profileId)
    .eq('following_id', followingId)

  return NextResponse.json({ ok: true })
}
