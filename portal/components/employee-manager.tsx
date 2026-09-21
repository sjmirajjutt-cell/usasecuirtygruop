'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/client'
import { AttendanceHistory } from '@/components/attendance-history'

const supabase = createClient()

export function EmployeeManager({ initialEmployees, initialAttendance }: { initialEmployees: Profile[]; initialAttendance: Attendance[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [now, setNow] = useState(Date.now())
  const attendanceByEmployee = new Map(attendance.filter(row => !row.check_out).map(row => [row.employee_id, row]))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const refreshAttendance = async () => {
      const response = await fetch('/api/attendance', { cache: 'no-store' })
      if (!response.ok) return
      const result = await response.json()
      setAttendance(result.attendance as Attendance[])
    }
    const refreshTimer = window.setInterval(refreshAttendance, 5000)
    const channel = supabase.channel('admin-employees-attendance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, payload => {
        const row = payload.new as Attendance
        if (payload.eventType === 'INSERT') setAttendance(rows => [row, ...rows.filter(item => item.id !== row.id)])
        if (payload.eventType === 'UPDATE') setAttendance(rows => rows.map(item => item.id === row.id ? row : item))
      })
      .subscribe()
    return () => { window.clearInterval(timer); window.clearInterval(refreshTimer); supabase.removeChannel(channel) }
  }, [])

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const response = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
    const result = await response.json()
    if (!response.ok) setError(result.error ?? 'Unable to create employee')
    else {
      setMessage(`Employee ${result.employeeId} created. They can now sign in.`)
      formElement.reset()
      window.location.reload()
    }
    setLoading(false)
  }

  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <section className="panel p-6"><div><span className="section-kicker">New employee</span><h3 className="mt-2 text-lg font-bold text-[#12263f]">Add field staff</h3><p className="mt-1 text-sm text-slate-500">Create login credentials and employee records in one step.</p></div><form onSubmit={createEmployee} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Full name<input name="fullName" required className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-600">Employee ID<input name="employeeId" required placeholder="USSPG-001" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label></div><label className="block text-xs font-bold text-slate-600">Email<input name="email" required type="email" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="block text-xs font-bold text-slate-600">Temporary password<input name="password" required minLength={8} type="password" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Phone<input name="phone" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-600">Hourly rate<input name="hourlyRate" required min="0" step="0.01" type="number" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label></div><label className="block text-xs font-bold text-slate-600">Address<textarea name="address" rows={2} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label>{error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<button disabled={loading} className="w-full rounded-md bg-[#12263f] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Creating employee...' : 'Create employee'}</button></form></section>
    <section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Roster</span><h3>Employees</h3></div><span className="text-sm text-slate-400">{employees.length} total · Live</span></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">ID</th><th className="px-6 py-3">Rate</th><th className="px-6 py-3">Work status</th><th className="px-6 py-3">Account status</th></tr></thead><tbody className="divide-y divide-slate-100">{employees.map(employee => { const activeShift = attendanceByEmployee.get(employee.id); const hours = activeShift ? Math.max(0, (now - new Date(activeShift.check_in).getTime()) / 3600000) : 0; return <tr key={employee.id}><td className="px-6 py-4"><strong className="block text-[#12263f]">{employee.full_name}</strong><small className="text-slate-400">{employee.phone || 'No phone'}</small></td><td className="px-6 py-4 font-semibold">{employee.employee_id || 'Not assigned'}</td><td className="px-6 py-4">${Number(employee.hourly_rate).toFixed(2)}</td><td className="px-6 py-4">{activeShift ? <span className="text-emerald-600">Checked in · {hours.toFixed(2)}h</span> : <span className="text-slate-400">Off shift</span>}</td><td className="px-6 py-4"><span className={employee.is_active ? 'text-emerald-600' : 'text-red-500'}>{employee.is_active ? 'Account active' : 'Account inactive'}</span></td></tr> })}</tbody></table>{employees.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No employees added yet.</p>}</div></section>
  </div><AttendanceHistory rows={attendance} employees={employees} /></div>
}