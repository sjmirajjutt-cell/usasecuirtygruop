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
  const query = supabase.from('payroll_payments').select('*').order('paid_at', { ascending: false })
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
  if (!employeeId || !periodStart || !periodEnd || !Number.isFinite(totalHours) || !Number.isFinite(grossAmount)) return NextResponse.json({ error: 'Employee, payroll period, hours, and amount are required.' }, { status: 400 })
  if (totalHours <= 0 || grossAmount <= 0) return NextResponse.json({ error: 'Cannot mark payroll paid because this period has no payable hours.' }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('payroll_payments').insert({ employee_id: employeeId, period_start: periodStart, period_end: periodEnd, total_hours: totalHours, gross_amount: grossAmount }).select('*').single()
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'This employee payroll period is already marked as paid.' : error.message }, { status: 400 })
  return NextResponse.json({ payment: data })
}
