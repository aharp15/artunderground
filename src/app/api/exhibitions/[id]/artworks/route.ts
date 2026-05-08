import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface Ctx { params: Promise<{ id: string }> }

const AddSchema = z.object({ artwork_id: z.string().uuid(), position: z.number().int().optional() })

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id: exhibition_id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = AddSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { error } = await supabase
    .from('exhibition_artworks')
    .insert({ exhibition_id, artwork_id: parsed.data.artwork_id, position: parsed.data.position ?? 0 })

  if (error) return NextResponse.json({ error: 'Failed to add artwork' }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id: exhibition_id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const artwork_id = request.nextUrl.searchParams.get('artwork_id')
  if (!artwork_id) return NextResponse.json({ error: 'artwork_id required' }, { status: 400 })

  const { error } = await supabase
    .from('exhibition_artworks')
    .delete()
    .eq('exhibition_id', exhibition_id)
    .eq('artwork_id', artwork_id)

  if (error) return NextResponse.json({ error: 'Failed to remove artwork' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
