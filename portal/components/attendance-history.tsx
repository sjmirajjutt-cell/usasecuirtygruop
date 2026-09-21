'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attendance, Profile, WorkLocation } from '@/lib/supabase/database.types'

const supabase = createClient()

export function AttendanceHistory({ rows, employees, locations = [] }: { rows: Attendance[]; employees: Profile[]; locations?: WorkLocation[] }) {
  const [attendance, setAttendance] = useState(rows)
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
  const locationNames = new Map(locations.map(location => [location.id, location.location_name]))
  return <section className="print-sheet panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Attendance</span><h3>Recent employee shifts</h3></div><span className="text-sm text-slate-400">{attendance.length} records · Live</span></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Assigned location</th><th className="px-6 py-3">Employee GPS</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Check in</th><th className="px-6 py-3">Check out</th><th className="px-6 py-3">Hours</th></tr></thead><tbody className="divide-y divide-slate-100">{attendance.map(row => { const gps = row.check_in_latitude !== null && row.check_in_longitude !== null ? `${row.check_in_latitude.toFixed(6)}, ${row.check_in_longitude.toFixed(6)}` : 'Not available'; const gpsUrl = row.check_in_latitude !== null && row.check_in_longitude !== null ? `https://www.google.com/maps?q=${row.check_in_latitude},${row.check_in_longitude}` : ''; return <tr key={row.id}><td className="px-6 py-4 font-semibold">{names.get(row.employee_id) ?? 'Unknown employee'}</td><td className="px-6 py-4">{locationNames.get(row.assigned_location_id ?? '') ?? 'Unassigned'}</td><td className="px-6 py-4">{gpsUrl ? <a href={gpsUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#2d8fd5] hover:underline">{gps}</a> : gps}</td><td className="px-6 py-4"><span className={row.location_status === 'matched' ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{row.location_status}</span>{row.distance_from_location_meters !== null && <small className="block text-slate-400">{Math.round(row.distance_from_location_meters)}m away</small>}</td><td className="px-6 py-4">{new Date(row.check_in).toLocaleString('en-US')}</td><td className="px-6 py-4">{row.check_out ? new Date(row.check_out).toLocaleString('en-US') : <span className="font-semibold text-emerald-600">Checked in</span>}</td><td className="px-6 py-4 font-semibold">{row.check_out ? Number(row.total_hours ?? 0).toFixed(2) : 'Live'}</td></tr> })}</tbody></table>{attendance.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attendance records yet.</p>}</div></section>
}
