'use client'

import { FormEvent, useMemo, useState } from 'react'
import type { Attendance, Profile, WorkLocation } from '@/lib/supabase/database.types'

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function AttendanceManager({ initialRows, employees, locations }: { initialRows: Attendance[]; employees: Profile[]; locations: WorkLocation[] }) {
  const [rows, setRows] = useState(initialRows)
  const [date, setDate] = useState(today())
  const [status, setStatus] = useState<'present' | 'absent' | 'half_day'>('present')
  const [hours, setHours] = useState('8')
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const names = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees])
  const locationNames = useMemo(() => new Map(locations.map(location => [location.id, location.location_name])), [locations])
  const dayRows = rows.filter(row => row.check_in.slice(0, 10) === date)
  const counts = {
    present: dayRows.filter(row => row.attendance_status === 'present').length,
    half_day: dayRows.filter(row => row.attendance_status === 'half_day').length,
    absent: dayRows.filter(row => row.attendance_status === 'absent').length
  }

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, date, status, hours: status === 'absent' ? 0 : Number(hours) })
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Attendance could not be saved.')
        return
      }
      setRows(current => [result.attendance as Attendance, ...current.filter(row => row.id !== result.attendance.id)])
      setMessage(`${names.get(employeeId)?.full_name ?? 'Employee'} marked ${status.replace('_', ' ')}.`)
    } catch {
      setError('Attendance could not be saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-5">
    <section className="panel p-6">
      <span className="section-kicker">Step 2</span>
      <h3 className="mt-2 text-lg font-bold text-[#12263f]">Mark daily attendance</h3>
      <p className="mt-1 text-sm text-slate-500">Choose an employee, mark their day, and enter the hours worked. Payouts update automatically.</p>
      <form onSubmit={saveAttendance} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:items-end">
        <label className="text-sm font-semibold text-slate-700">Date
          <input type="date" required value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Employee
          <select required value={employeeId} onChange={event => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 font-normal">
            {employees.length === 0 && <option value="">Add an employee first</option>}
            {employees.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Attendance
          <select value={status} onChange={event => { const next = event.target.value as typeof status; setStatus(next); setHours(next === 'half_day' ? '4' : '8') }} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 font-normal">
            <option value="present">Present</option><option value="half_day">Half day</option><option value="absent">Absent</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Hours worked
          <input type="number" min="0.01" max="24" step="0.25" required={status !== 'absent'} disabled={status === 'absent'} value={status === 'absent' ? '0' : hours} onChange={event => setHours(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal disabled:bg-slate-100" />
        </label>
        <button disabled={saving || !employeeId} className="rounded-md bg-[#12263f] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save attendance'}</button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    </section>

    <section className="panel overflow-hidden">
      <div className="panel-heading"><div><span className="section-kicker">Daily summary</span><h3>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3></div></div>
      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
        <div className="rounded-md bg-emerald-50 p-4"><span className="text-xs text-emerald-700">Present</span><strong className="mt-1 block text-xl text-emerald-800">{counts.present}</strong></div>
        <div className="rounded-md bg-amber-50 p-4"><span className="text-xs text-amber-700">Half day</span><strong className="mt-1 block text-xl text-amber-800">{counts.half_day}</strong></div>
        <div className="rounded-md bg-slate-100 p-4"><span className="text-xs text-slate-600">Absent</span><strong className="mt-1 block text-xl text-slate-800">{counts.absent}</strong></div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Assigned location</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Hours</th><th className="px-5 py-3">Payout estimate</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{dayRows.map(row => {
            const employee = names.get(row.employee_id)
            const workedHours = Number(row.total_hours ?? 0)
            const amount = row.attendance_status === 'absent' ? 0 : workedHours * Number(employee?.hourly_rate ?? 0)
            return <tr key={row.id}>
              <td className="px-5 py-4 font-semibold text-[#12263f]">{employee?.full_name ?? 'Unknown employee'}</td>
              <td className="px-5 py-4">{locationNames.get(row.assigned_location_id ?? '') ?? 'Not assigned'}</td>
              <td className="px-5 py-4 capitalize">{row.attendance_status.replace('_', ' ')}</td>
              <td className="px-5 py-4">{workedHours.toFixed(2)}</td>
              <td className="px-5 py-4 font-semibold">${amount.toFixed(2)}{row.is_paid && <small className="ml-2 text-emerald-700">Paid</small>}</td>
            </tr>
          })}</tbody>
        </table>
        {dayRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attendance saved for this day yet.</p>}
      </div>
    </section>
  </div>
}
