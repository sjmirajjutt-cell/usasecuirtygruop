import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/supabase/database.types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const adminProfile = profileData as Pick<Profile, 'role'> | null
  if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()
  const fullName = String(body.fullName ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const employeeId = String(body.employeeId ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const address = String(body.address ?? '').trim()
  const hourlyRate = Number(body.hourlyRate ?? 0)

  if (!fullName || !email || password.length < 8 || !employeeId || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return NextResponse.json({ error: 'Name, employee ID, email, password (8+ characters), and a valid hourly rate are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })
  if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? 'Unable to create employee' }, { status: 400 })

  const { error: profileError } = await admin.from('profiles').update({
    full_name: fullName,
    role: 'officer',
    employee_id: employeeId,
    phone: phone || null,
    address: address || null,
    hourly_rate: hourlyRate,
    is_active: true
  }).eq('id', created.user.id)

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ id: created.user.id, employeeId })
}