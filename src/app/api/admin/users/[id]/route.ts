import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, is_admin').eq('auth_user_id', user.id).single()
  if (!(profile as any)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-demotion
  if ((profile as any).id === id) {
    return NextResponse.json({ error: 'Cannot change your own admin status' }, { status: 400 })
  }

  const { is_admin } = await request.json()
  if (typeof is_admin !== 'boolean') return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin.from('profiles').update({ is_admin }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
