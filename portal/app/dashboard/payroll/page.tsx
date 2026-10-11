import { PageHeader } from '@/components/portal-shell'
import { PayrollManager } from '@/components/payroll-manager'
import { createClient } from '@/lib/supabase/server'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

export default async function PayrollPage() {
  const supabase = await createClient()
  const [{ data: employees }, { data: attendance }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(1000)
  ])
  return <><PageHeader eyebrow="Step 3 of 3" title="Payroll" description="Choose daily, weekly, or monthly to total shift hours and calculate employee payouts." /><section className="dashboard-content"><PayrollManager employees={(employees ?? []) as Profile[]} attendance={(attendance ?? []) as Attendance[]} /></section></>
}