import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateSchema = z.object({
  title:           z.string().min(2).max(120),
  statement:       z.string().max(1000).optional(),
  visibility:      z.enum(['public', 'link_only', 'invite_only']).default('public'),
  opens_at:        z.string().datetime().optional(),
  closes_at:       z.string().datetime().optional(),
  auction_enabled: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const mine = request.nextUrl.searchParams.get('mine') === 'true'

  if (mine) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) return NextResponse.json({ exhibitions: [] })
    const { data } = await supabase
      .from('exhibitions')
      .select('*, curator:profiles(id, display_name, avatar_url), _count:exhibition_artworks(count)')
      .eq('curator_id', (profile as any).id)
      .order('created_at', { ascending: false })
    return NextResponse.json({ exhibitions: data ?? [] })
  }

  const { data } = await supabase
    .from('exhibitions')
    .select('*, curator:profiles(id, display_name, avatar_url)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ exhibitions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, roles').eq('auth_user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!(profile as any).roles?.includes('curator')) {
    return NextResponse.json({ error: 'Only curators can create exhibitions' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })

  const { data: exhibition, error } = await supabase
    .from('exhibitions')
    .insert({ curator_id: (profile as any).id, ...parsed.data })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  return NextResponse.json({ exhibition }, { status: 201 })
}
