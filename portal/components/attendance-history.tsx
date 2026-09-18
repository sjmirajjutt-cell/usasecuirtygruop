'use client'

import { useEffect, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

export function AttendanceHistory({ rows, employees }: { rows: Attendance[]; employees: Profile[] }) {
  const [attendance, setAttendance] = useState(rows)
  useEffect(() => {
    const refresh = async () => {
      const response = await fetch('/api/attendance', { cache: 'no-store' })
      if (response.ok) setAttendance((await response.json()).attendance as Attendance[])
    }
    const timer = window.setInterval(refresh, 5000)
    return () => window.clearInterval(timer)
  }, [])
  const names = new Map(employees.map(employee => [employee.id, employee.full_name]))
  return <section className="print-sheet panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Attendance</span><h3>Recent employee shifts</h3></div><span className="text-sm text-slate-400">{attendance.length} records · Live</span></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Check in</th><th className="px-6 py-3">Check out</th><th className="px-6 py-3">Hours</th></tr></thead><tbody className="divide-y divide-slate-100">{attendance.map(row => <tr key={row.id}><td className="px-6 py-4 font-semibold">{names.get(row.employee_id) ?? 'Unknown employee'}</td><td className="px-6 py-4">{new Date(row.check_in).toLocaleString('en-US')}</td><td className="px-6 py-4">{row.check_out ? new Date(row.check_out).toLocaleString('en-US') : <span className="font-semibold text-emerald-600">Checked in</span>}</td><td className="px-6 py-4 font-semibold">{row.check_out ? Number(row.total_hours ?? 0).toFixed(2) : 'Live'}</td></tr>)}</tbody></table>{attendance.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attendance records yet.</p>}</div></section>
}
