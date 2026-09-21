import { PageHeader } from '@/components/portal-shell'
import { AttendanceHistory } from '@/components/attendance-history'
import { createClient } from '@/lib/supabase/server'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

export default async function AttendancePage() {
  const supabase = await createClient()
  const [{ data: attendance }, { data: employees }] = await Promise.all([
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').order('full_name')
  ])

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Attendance"
        description="Track check-ins, check-outs, and real-time shift records for the team."
      />
      <section className="dashboard-content">
        <AttendanceHistory rows={(attendance ?? []) as Attendance[]} employees={(employees ?? []) as Profile[]} />
      </section>
    </>
  )
}
