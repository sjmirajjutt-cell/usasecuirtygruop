import { PageHeader } from '@/components/portal-shell'
import { PayrollManager } from '@/components/payroll-manager'
import { createClient } from '@/lib/supabase/server'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

type Payment = { id: string; employee_id: string; period_start: string; period_end: string; total_hours: number; gross_amount: number; status: string; paid_at: string }

export default async function PayrollPage() {
  const supabase = await createClient()
  const [{ data: employees }, { data: attendance }, { data: payments }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(1000),
    supabase.from('payroll_payments').select('*').order('paid_at', { ascending: false })
  ])
  return <><PageHeader eyebrow="Finance" title="Payroll" description="Review live employee payouts, mark payroll paid, and keep payment history." /><section className="dashboard-content"><PayrollManager employees={(employees ?? []) as Profile[]} attendance={(attendance ?? []) as Attendance[]} payments={(payments ?? []) as Payment[]} /></section></>
}