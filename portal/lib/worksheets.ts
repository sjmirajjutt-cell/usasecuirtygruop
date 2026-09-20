import type { Attendance, Profile, WorksheetWithRelations } from '@/lib/supabase/database.types'

export function summarizeWorksheets(rows: WorksheetWithRelations[]) {
  const summary = rows.reduce(
    (totals, row) => {
      totals.officerIds.add(row.officer_id)
      totals.hours += Number(row.total_hours)
      totals.payout += Number(row.total_amount)
      return totals
    },
    { officerIds: new Set<string>(), hours: 0, payout: 0 }
  )
  return { guards: summary.officerIds.size, hours: summary.hours, payout: summary.payout }
}

export function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`
  const endDate = new Date(Date.UTC(year, monthNumber, 0))
  const end = `${year}-${String(monthNumber).padStart(2, '0')}-${String(endDate.getUTCDate()).padStart(2, '0')}`
  return { start, end }
}

export function attendanceToWorksheetRows(attendance: Attendance[], employees: Pick<Profile, 'id' | 'full_name' | 'hourly_rate'>[]) {
  const employeeRates = new Map(employees.map(employee => [employee.id, employee.hourly_rate]))
  const employeeNames = new Map(employees.map(employee => [employee.id, employee.full_name]))
  const totals = new Map<string, { latest: Attendance; hours: number }>()

  for (const row of attendance) {
    const current = totals.get(row.employee_id)
    const hours = row.total_hours ?? (Date.now() - new Date(row.check_in).getTime()) / 3600000
    totals.set(row.employee_id, {
      latest: !current || row.check_in > current.latest.check_in ? row : current.latest,
      hours: (current?.hours ?? 0) + hours
    })
  }

  return [...totals.entries()].map(([employeeId, total]) => {
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
}
