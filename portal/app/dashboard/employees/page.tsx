import { PageHeader } from '@/components/portal-shell'
import { EmployeeManager } from '@/components/employee-manager'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/database.types'
import type { Attendance } from '@/lib/supabase/database.types'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const [{ data }, { data: attendance }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(100)
  ])
  return <><PageHeader eyebrow="Team" title="Employees" description="Create employee accounts, assign IDs, and manage staff details." /><section className="dashboard-content"><EmployeeManager initialEmployees={(data ?? []) as Profile[]} initialAttendance={(attendance ?? []) as Attendance[]} /></section></>
}