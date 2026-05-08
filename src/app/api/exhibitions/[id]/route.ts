import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateSchema = z.object({
  title:           z.string().min(2).max(120).optional(),
  statement:       z.string().max(1000).optional(),
  status:          z.enum(['draft', 'published', 'closed']).optional(),
  visibility:      z.enum(['public', 'link_only', 'invite_only']).optional(),
  opens_at:        z.string().datetime().nullable().optional(),
  closes_at:       z.string().datetime().nullable().optional(),
  auction_enabled: z.boolean().optional(),
})

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: exhibition } = await supabase
    .from('exhibitions')
    .select(`
      *,
      curator:profiles(id, display_name, avatar_url, bio, location),
      artworks:exhibition_artworks(
        position,
        artwork:artworks(id, title, medium, year, price_gbp, image_urls, status,
          artist:profiles(id, display_name, avatar_url))
      )
    `)
    .eq('id', id)
    .single()

  if (!exhibition) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ exhibition })
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { data: exhibition, error } = await supabase
    .from('exhibitions').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ exhibition })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('exhibitions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
