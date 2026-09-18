'use client'

import { useMemo, useState } from 'react'
import type { WorksheetWithRelations } from '@/lib/supabase/database.types'
import { summarizeWorksheets } from '@/lib/worksheets'

export function WorksheetTable({ initialRows }: { initialRows: WorksheetWithRelations[] }) {
  const [month, setMonth] = useState('')
  const [employee, setEmployee] = useState('')
  const [reportType, setReportType] = useState('all')
  const [search, setSearch] = useState('')
  const employees = [...new Set(initialRows.map(row => row.officer?.full_name).filter(Boolean))].sort()
  const rows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return initialRows.filter(row => {
      const officer = row.officer?.full_name ?? ''
      const isAttendance = row.location?.location_name === 'Employee attendance'
      const matchesMonth = !month || row.date.startsWith(month)
      const matchesEmployee = !employee || officer === employee
      const matchesType = reportType === 'all' || (reportType === 'attendance' ? isAttendance : !isAttendance)
      const matchesSearch = !normalizedSearch || [officer, row.location?.location_name, row.shift_hours].join(' ').toLowerCase().includes(normalizedSearch)
      return matchesMonth && matchesEmployee && matchesType && matchesSearch
    })
  }, [employee, initialRows, month, reportType, search])
  const summary = summarizeWorksheets(rows)
  const hasFilters = Boolean(month || employee || search || reportType !== 'all')
  const clearFilters = () => { setMonth(''); setEmployee(''); setReportType('all'); setSearch('') }

  return <div className="worksheet-report space-y-5"><div className="worksheet-filters no-print"><div className="worksheet-filter-heading"><div><span className="section-kicker">Report filters</span><h3>Find shifts and attendance</h3></div><span className="filter-count">{rows.length} of {initialRows.length} records</span></div><div className="worksheet-filter-grid"><label>Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} /></label><label>Employee<select value={employee} onChange={event => setEmployee(event.target.value)}><option value="">All employees</option>{employees.map(name => <option key={name} value={name}>{name}</option>)}</select></label><label>Report type<select value={reportType} onChange={event => setReportType(event.target.value)}><option value="all">All records</option><option value="attendance">Employee attendance</option><option value="worksheet">Manual worksheets</option></select></label><label className="search-filter">Search<input type="search" placeholder="Name, location or shift" value={search} onChange={event => setSearch(event.target.value)} /></label></div><div className="worksheet-filter-actions"><button className="filter-clear" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button><button className="filter-print" onClick={() => window.print()}>Print filtered report</button></div></div><div className="worksheet-summary grid gap-4 sm:grid-cols-3">{[['Guards', summary.guards], ['Hours', summary.hours.toFixed(2)], ['Payout', `$${summary.payout.toFixed(2)}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#12263f]">{value}</p></div>)}</div><div className="print-sheet overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><div className="print-report-heading"><strong>Worksheet report</strong><span>{rows.length} records</span></div><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Date', 'Officer', 'Location', 'Shift', 'Hours', 'Rate', 'Amount'].map(header => <th key={header} className="px-5 py-4">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id}><td className="px-5 py-4">{row.date}</td><td className="px-5 py-4 font-semibold">{row.officer?.full_name ?? 'Unknown'}</td><td className="px-5 py-4">{row.location?.location_name ?? 'Unknown'}</td><td className="px-5 py-4">{row.shift_hours}</td><td className="px-5 py-4">{Number(row.total_hours).toFixed(2)}</td><td className="px-5 py-4">${Number(row.hourly_rate).toFixed(2)}</td><td className="px-5 py-4 font-semibold">${Number(row.total_amount).toFixed(2)}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No records match these filters.</p>}</div></div>
}
