import type { WorksheetWithRelations } from '@/lib/supabase/database.types'

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
