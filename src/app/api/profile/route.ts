import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateProfileSchema = z.object({
  display_name: z.string().min(2).max(80),
  roles: z.array(z.enum(['artist', 'collector', 'curator'])).min(1),
  bio: z.string().max(600).optional(),
  location: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
})
const UpdateProfileSchema = CreateProfileSchema.partial()

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: existing } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
  if (existing) return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
  const body = await request.json()
  const parsed = CreateProfileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  const { data: profile, error } = await supabase.from('profiles').insert({ auth_user_id: user.id, ...parsed.data }).select().single()
  if (error) return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  return NextResponse.json({ profile }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  const { data: profile, error } = await supabase.from('profiles').update(parsed.data).eq('auth_user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  return NextResponse.json({ profile })
}
