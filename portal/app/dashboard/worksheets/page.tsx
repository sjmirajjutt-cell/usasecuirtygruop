import { PageHeader } from '@/components/portal-shell'
import { WorksheetTable } from '@/components/worksheet-table'
import { AttendanceHistory } from '@/components/attendance-history'
import { createClient } from '@/lib/supabase/server'
import type { WorksheetWithRelations } from '@/lib/supabase/database.types'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

export default async function WorksheetsPage() {
  const supabase = await createClient()
  const [{ data, error }, { data: attendance }, { data: employees }] = await Promise.all([
    supabase.from('worksheets').select('*, officer:profiles(full_name), location:work_locations(location_name, client_name)').order('date', { ascending: false }).limit(500),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(100),
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, created_at').eq('role', 'officer')
  ])
  if (error) throw new Error(error.message)
  const employeeRates = new Map((employees ?? []).map(employee => [employee.id, employee.hourly_rate]))
  const employeeNames = new Map((employees ?? []).map(employee => [employee.id, employee.full_name]))
  const attendanceTotals = new Map<string, { latest: Attendance; hours: number }>()
  for (const row of (attendance ?? []) as Attendance[]) {
    const current = attendanceTotals.get(row.employee_id)
    const hours = row.total_hours ?? (Date.now() - new Date(row.check_in).getTime()) / 3600000
    attendanceTotals.set(row.employee_id, {
      latest: !current || row.check_in > current.latest.check_in ? row : current.latest,
      hours: (current?.hours ?? 0) + hours
    })
  }
  const attendanceRows = [...attendanceTotals.entries()].map(([employeeId, total]) => {
    const hourlyRate = Number(employeeRates.get(employeeId) ?? 0)
    return {
      id: `attendance-total-${employeeId}`,
      officer_id: employeeId,
      location_id: '',
      date: total.latest.check_in.slice(0, 10),
      shift_hours: 'Employee attendance total',
      total_hours: total.hours,
      hourly_rate: hourlyRate,
      total_amount: total.hours * hourlyRate,
      created_at: total.latest.created_at,
      officer: { full_name: employeeNames.get(employeeId) ?? 'Unknown employee' },
      location: { location_name: 'Employee attendance', client_name: '' }
    } satisfies WorksheetWithRelations
  })
  const worksheetRows = [...((data ?? []) as unknown as WorksheetWithRelations[]), ...attendanceRows]
  return <><PageHeader eyebrow="Guard operations" title="Worksheets" description="Review shifts, calculate monthly totals, and produce a print-ready payout report." /><section className="dashboard-content"><WorksheetTable initialRows={worksheetRows} /><AttendanceHistory rows={(attendance ?? []) as Attendance[]} employees={(employees ?? []) as Profile[]} /></section></>
}
