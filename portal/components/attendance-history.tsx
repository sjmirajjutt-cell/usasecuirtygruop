'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attendance, Profile, WorkLocation } from '@/lib/supabase/database.types'

const supabase = createClient()

type Filters = { search: string; employeeId: string; locationId: string; clientName: string; status: string; from: string; to: string }
const emptyFilters: Filters = { search: '', employeeId: '', locationId: '', clientName: '', status: '', from: '', to: '' }

export function AttendanceHistory({ rows, employees, locations = [] }: { rows: Attendance[]; employees: Profile[]; locations?: WorkLocation[] }) {
  const [attendance, setAttendance] = useState(rows)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch('/api/attendance', { cache: 'no-store' })
      if (response.ok) setAttendance((await response.json()).attendance as Attendance[])
    }
    const timer = window.setInterval(refresh, 10000)
    const channel = supabase.channel('admin-attendance-live').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, refresh).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh).subscribe()
    return () => { window.clearInterval(timer); supabase.removeChannel(channel) }
  }, [])

  const names = new Map(employees.map(employee => [employee.id, employee.full_name]))
  const locationMap = new Map(locations.map(location => [location.id, location]))
  const clients = [...new Set(locations.map(location => location.client_name).filter(Boolean))].sort()
  const filteredAttendance = useMemo(() => attendance.filter(row => {
    const location = locationMap.get(row.assigned_location_id ?? '')
    const employeeName = names.get(row.employee_id) ?? 'Unknown employee'
    const date = row.check_in.slice(0, 10)
    const matchesSearch = !filters.search || `${employeeName} ${location?.location_name ?? ''} ${location?.client_name ?? ''}`.toLowerCase().includes(filters.search.toLowerCase())
    return matchesSearch && (!filters.employeeId || row.employee_id === filters.employeeId) && (!filters.locationId || row.assigned_location_id === filters.locationId) && (!filters.clientName || location?.client_name === filters.clientName) && (!filters.status || row.location_status === filters.status) && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
  }), [attendance, filters, employees, locations])

  function setFilter(key: keyof Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }))
  }

  function exportExcel() {
    const header = ['Employee', 'Assigned location', 'Client', 'GPS latitude', 'GPS longitude', 'Status', 'Distance meters', 'Check in', 'Check out', 'Hours']
    const lines = filteredAttendance.map(row => {
      const location = locationMap.get(row.assigned_location_id ?? '')
      return [names.get(row.employee_id) ?? 'Unknown employee', location?.location_name ?? 'Unassigned', location?.client_name ?? '', row.check_in_latitude ?? '', row.check_in_longitude ?? '', row.location_status, row.distance_from_location_meters ?? '', row.check_in, row.check_out ?? '', row.total_hours ?? ''].map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')
    })
    const blob = new Blob([`${[header.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="print-sheet panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Attendance</span><h3>Employee attendance</h3></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowFilters(value => !value)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">{showFilters ? 'Hide filters' : 'Show filters'}</button><button type="button" onClick={() => window.print()} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Print</button><button type="button" onClick={exportExcel} className="rounded-md bg-[#12263f] px-3 py-2 text-xs font-bold text-white">Export Excel</button></div></div>
    {showFilters && <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4"><input value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Search employee, location, client" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><select value={filters.employeeId} onChange={event => setFilter('employeeId', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All employees</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select><select value={filters.locationId} onChange={event => setFilter('locationId', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All locations</option>{locations.map(location => <option key={location.id} value={location.id}>{location.location_name}</option>)}</select><select value={filters.clientName} onChange={event => setFilter('clientName', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All clients</option>{clients.map(client => <option key={client} value={client}>{client}</option>)}</select><select value={filters.status} onChange={event => setFilter('status', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="matched">Matched</option><option value="outside_radius">Outside radius</option><option value="not_verified">Not verified</option></select><label className="text-xs font-bold text-slate-500">From<input type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-500">To<input type="date" value={filters.to} onChange={event => setFilter('to', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><button type="button" onClick={() => setFilters(emptyFilters)} className="self-end rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">Clear filters</button></div>}
    <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-400"><span>{filteredAttendance.length} of {attendance.length} records</span><span>Live updates enabled</span></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Assigned location</th><th className="px-6 py-3">Client</th><th className="px-6 py-3">Employee GPS</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Check in</th><th className="px-6 py-3">Check out</th><th className="px-6 py-3">Hours</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAttendance.map(row => { const location = locationMap.get(row.assigned_location_id ?? ''); const gps = row.check_in_latitude !== null && row.check_in_longitude !== null ? `${row.check_in_latitude.toFixed(6)}, ${row.check_in_longitude.toFixed(6)}` : 'Not available'; const gpsUrl = row.check_in_latitude !== null && row.check_in_longitude !== null ? `https://www.google.com/maps?q=${row.check_in_latitude},${row.check_in_longitude}` : ''; return <tr key={row.id}><td className="px-6 py-4 font-semibold">{names.get(row.employee_id) ?? 'Unknown employee'}</td><td className="px-6 py-4">{location?.location_name ?? 'Unassigned'}</td><td className="px-6 py-4">{location?.client_name ?? 'No client'}</td><td className="px-6 py-4">{gpsUrl ? <a href={gpsUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#2d8fd5] hover:underline">{gps}</a> : gps}</td><td className="px-6 py-4"><span className={row.location_status === 'matched' ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{row.location_status}</span>{row.distance_from_location_meters !== null && <small className="block text-slate-400">{Math.round(row.distance_from_location_meters)}m away</small>}</td><td className="px-6 py-4">{new Date(row.check_in).toLocaleString('en-US')}</td><td className="px-6 py-4">{row.check_out ? new Date(row.check_out).toLocaleString('en-US') : <span className="font-semibold text-emerald-600">Checked in</span>}</td><td className="px-6 py-4 font-semibold">{row.check_out ? Number(row.total_hours ?? 0).toFixed(2) : 'Live'}</td></tr> })}</tbody></table>{filteredAttendance.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attendance records match these filters.</p>}</div></section>
}
