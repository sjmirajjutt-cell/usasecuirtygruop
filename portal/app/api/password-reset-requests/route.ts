import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('password_reset_requests').select('*').order('created_at', { ascending: false })
  if (!isAdmin) query = query.eq('employee_id', user.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const reason = String(body.reason ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()

  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
  const requestedByName = profile?.full_name || 'Employee'
  const admin = createAdminClient()
  const { data: existing } = await admin.from('password_reset_requests').select('id').eq('employee_id', user.id).eq('status', 'pending').limit(1).single()
  if (existing) return NextResponse.json({ error: 'A password reset request is already pending.' }, { status: 409 })

  const { error } = await admin.from('password_reset_requests').insert({
    employee_id: user.id,
    requested_by_name: requestedByName,
    email,
    reason: reason || 'Password reset request',
    status: 'pending',
    note: null,
    reviewer_id: null,
    reviewed_at: null
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()
  const id = String(body.id ?? '')
  const status = String(body.status ?? '').trim()
  const note = String(body.note ?? '').trim()

  if (!id || !['approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Invalid reset request update.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('password_reset_requests').update({
    status,
    note: note || null,
    reviewer_id: user.id,
    reviewed_at: new Date().toISOString()
  }).eq('id', id).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (status === 'approved') {
    const { data: target } = await admin.from('profiles').select('full_name, role').eq('id', data.employee_id).single()
    if (target) {
      await admin.auth.admin.generateLink({
        type: 'recovery',
        email: data.email
      })
    }
  }

  return NextResponse.json({ request: data })
}
