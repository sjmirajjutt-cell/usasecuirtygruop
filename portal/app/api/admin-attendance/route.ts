import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const statuses = ['present', 'absent', 'half_day'] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const employeeId = String(body.employeeId ?? '')
  const date = String(body.date ?? '')
  const status = String(body.status ?? '')
  const hours = Number(body.hours)
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !statuses.includes(status as typeof statuses[number])) {
    return NextResponse.json({ error: 'Choose an employee, valid date, and attendance status.' }, { status: 400 })
  }
  if (!Number.isFinite(hours) || hours < 0 || hours > 24 || (status === 'absent' ? hours !== 0 : hours <= 0)) {
    return NextResponse.json({ error: 'Enter hours from 0 to 24. Absent employees must have 0 hours.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: employee, error: employeeError } = await admin.from('profiles').select('assigned_location_id').eq('id', employeeId).eq('role', 'officer').single()
  if (employeeError || !employee) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

  const start = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: 'Enter a real calendar date.' }, { status: 400 })
  }
  const nextDay = new Date(start)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const checkIn = new Date(`${date}T12:00:00.000Z`)
  const checkOut = new Date(checkIn.getTime() + hours * 60 * 60 * 1000)
  const record = {
    employee_id: employeeId,
    assigned_location_id: employee.assigned_location_id,
    check_in: checkIn.toISOString(),
    check_out: checkOut.toISOString(),
    attendance_status: status,
    location_status: 'not_verified'
  }

  const { data: existing, error: lookupError } = await admin.from('attendance')
    .select('id, is_paid')
    .eq('employee_id', employeeId)
    .gte('check_in', start.toISOString())
    .lt('check_in', nextDay.toISOString())
    .order('check_in', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  if (existing?.is_paid) return NextResponse.json({ error: 'This day is already included in a payout and cannot be changed.' }, { status: 409 })

  const query = existing
    ? admin.from('attendance').update(record).eq('id', existing.id)
    : admin.from('attendance').insert(record)
  const { data, error } = await query.select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ attendance: data })
}
