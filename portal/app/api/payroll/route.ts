import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  return { user }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const admin = createAdminClient()
  const query = admin.from('payroll_payments').select('*').order('paid_at', { ascending: false })
  const { data, error } = profile?.role === 'admin' ? await query : await query.eq('employee_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response
  const body = await request.json().catch(() => ({}))
  const employeeId = String(body.employeeId ?? '')
  const periodStart = String(body.periodStart ?? '')
  const periodEnd = String(body.periodEnd ?? '')
  const totalHours = Number(body.totalHours)
  const grossAmount = Number(body.grossAmount)
  const attendanceIds = Array.isArray(body.attendanceIds) ? body.attendanceIds.map(String).filter(Boolean) : []
  if (!employeeId || !periodStart || !periodEnd || !Number.isFinite(totalHours) || !Number.isFinite(grossAmount)) return NextResponse.json({ error: 'Employee, payroll period, hours, and amount are required.' }, { status: 400 })
  if (totalHours < 0 || grossAmount < 0 || (attendanceIds.length === 0 && (totalHours !== 0 || grossAmount !== 0)) || (attendanceIds.length > 0 && totalHours === 0)) {
    return NextResponse.json({ error: 'Payroll amounts must match the unpaid shift records.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.from('payroll_payments').insert({ employee_id: employeeId, period_start: periodStart, period_end: periodEnd, total_hours: totalHours, gross_amount: grossAmount }).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'This employee payroll period is already marked as paid.' : error.message }, { status: 400 })

  const paidAt = new Date().toISOString()
  const { error: activeAttendanceError } = attendanceIds.length
    ? await admin.from('attendance').update({ paid_at: paidAt, is_paid: false }).eq('employee_id', employeeId).eq('is_paid', false).is('check_out', null).in('id', attendanceIds)
    : { error: null }
  const { error: completedAttendanceError } = attendanceIds.length
    ? await admin.from('attendance').update({ is_paid: true }).eq('employee_id', employeeId).eq('is_paid', false).not('check_out', 'is', null).in('id', attendanceIds)
    : { error: null }
  if (activeAttendanceError || completedAttendanceError) {
    await admin.from('payroll_payments').delete().eq('id', data.id)
    return NextResponse.json({ error: activeAttendanceError?.message ?? completedAttendanceError?.message }, { status: 400 })
  }

  return NextResponse.json({ payment: data, paidAt })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response

  const body = await request.json().catch(() => ({}))
  const employeeId = String(body.employeeId ?? '')
  const periodStart = String(body.periodStart ?? '')
  const periodEnd = String(body.periodEnd ?? '')
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || periodEnd < periodStart) {
    return NextResponse.json({ error: 'Employee and a valid payroll period are required.' }, { status: 400 })
  }

  const start = new Date(`${periodStart}T00:00:00.000Z`)
  const end = new Date(`${periodEnd}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.toISOString().slice(0, 10) !== periodStart || end.toISOString().slice(0, 10) !== periodEnd) {
    return NextResponse.json({ error: 'Enter a real payroll date range.' }, { status: 400 })
  }
  const nextDay = new Date(end)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  const admin = createAdminClient()
  const { error } = await admin.from('attendance')
    .update({ is_paid: false, paid_at: null })
    .eq('employee_id', employeeId)
    .gte('check_in', start.toISOString())
    .lt('check_in', nextDay.toISOString())
    .neq('attendance_status', 'absent')
    .gt('total_hours', 0)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: paymentError } = await admin.from('payroll_payments')
    .update({ status: 'unpaid' })
    .eq('employee_id', employeeId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
