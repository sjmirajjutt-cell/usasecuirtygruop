import { PageHeader } from '@/components/portal-shell'
import { EmployeeManager } from '@/components/employee-manager'
import { LocationManager } from '@/components/location-manager'
import { createClient } from '@/lib/supabase/server'
import type { Profile, WorkLocation } from '@/lib/supabase/database.types'
import type { Attendance } from '@/lib/supabase/database.types'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const [{ data }, { data: attendance }, { data: locations }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(100)
    ,supabase.from('work_locations').select('*').order('location_name')
  ])
  return <><PageHeader eyebrow="Team" title="Employees" description="Create employee accounts, assign IDs, and manage staff details." /><section className="dashboard-content"><EmployeeManager initialEmployees={(data ?? []) as Profile[]} initialAttendance={(attendance ?? []) as Attendance[]} /><LocationManager initialEmployees={(data ?? []) as Profile[]} initialLocations={(locations ?? []) as WorkLocation[]} /></section></>
}