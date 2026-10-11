import { PageHeader } from '@/components/portal-shell'
import { PayrollManager } from '@/components/payroll-manager'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

export default async function PayrollPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const [{ data: employees }, { data: attendance }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(1000),
    admin.from('payroll_payments').select('id, employee_id, period_start, period_end, total_hours, gross_amount, status, paid_at')
  ])
  if (paymentsError) throw new Error(`Unable to load payroll payments: ${paymentsError.message}`)
  return <><PageHeader eyebrow="Step 3 of 3" title="Payroll" description="Choose daily, weekly, or monthly to total shift hours and calculate employee payouts." /><section className="dashboard-content"><PayrollManager employees={(employees ?? []) as Profile[]} attendance={(attendance ?? []) as Attendance[]} payments={payments ?? []} /></section></>
}