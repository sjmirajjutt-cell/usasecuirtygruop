import { PageHeader } from '@/components/portal-shell'
import { EmployeeManagerSimple } from '@/components/employee-manager-simple'
import { createClient } from '@/lib/supabase/server'
import type { Profile, WorkLocation } from '@/lib/supabase/database.types'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const [{ data: employees }, { data: locations }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('work_locations').select('*').order('location_name')
  ])
  return <><PageHeader eyebrow="Step 2 of 4" title="Add employee" description="Add a team member, set their hourly rate, and choose a work location." /><section className="dashboard-content"><EmployeeManagerSimple initialEmployees={(employees ?? []) as Profile[]} locations={(locations ?? []) as WorkLocation[]} /></section></>
}