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
  const [hours, setHours] = useState('')
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const names = useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees])
  const locationNames = useMemo(() => new Map(locations.map(location => [location.id, location.location_name])), [locations])
  const dayRows = rows.filter(row => row.check_in.slice(0, 10) === date)
  const dayTotalHours = dayRows.reduce((total, row) => total + (row.attendance_status === 'absent' ? 0 : Number(row.total_hours ?? 0)), 0)
  const dayTotalPayout = dayRows.reduce((total, row) => {
    const employee = names.get(row.employee_id)
    return total + (row.attendance_status === 'absent' ? 0 : Number(row.total_hours ?? 0) * Number(employee?.hourly_rate ?? 0))
  }, 0)

  async function saveAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, date, status: 'present', hours: Number(hours) })
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Attendance could not be saved.')
        return
      }
      setRows(current => [result.attendance as Attendance, ...current.filter(row => row.id !== result.attendance.id)])
      setMessage(`${names.get(employeeId)?.full_name ?? 'Employee'} shift hours saved.`)
      setHours('')
    } catch {
      setError('Attendance could not be saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-5">
    <section className="panel p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <span className="section-kicker">Step 2</span>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.04em] text-[#12263f]">Record shift hours</h3>
        </div>
        <div className="rounded-full bg-[#edf9f6] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#2ea58a]">
          Daily
        </div>
      </div>

      <form onSubmit={saveAttendance} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-end">
        <label className="text-sm font-semibold text-slate-700">Date
          <input type="date" required value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Employee
          <select required value={employeeId} onChange={event => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10">
            {employees.length === 0 && <option value="">Add an employee first</option>}
            {employees.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Shift hours
          <input type="number" min="0.01" max="24" step="0.25" required value={hours} onChange={event => setHours(event.target.value)} placeholder="e.g. 8" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
        </label>
        <button disabled={saving || !employeeId} className="rounded-xl bg-[#12263f] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#12263f]/15 transition hover:bg-[#0f1c2d] disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    </section>

    <section className="panel overflow-hidden">
      <div className="panel-heading"><div><span className="section-kicker">Daily summary</span><h3>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3></div></div>
      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Shift records</span><strong className="mt-2 block text-2xl text-[#12263f]">{dayRows.length}</strong></div>
        <div className="rounded-2xl bg-[#edf6ff] p-4"><span className="text-xs font-bold uppercase tracking-[0.16em] text-[#4b98cf]">Total hours</span><strong className="mt-2 block text-2xl text-[#12263f]">{dayTotalHours.toFixed(2)}</strong></div>
        <div className="rounded-2xl bg-emerald-50 p-4"><span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Estimated payout</span><strong className="mt-2 block text-2xl text-emerald-700">${dayTotalPayout.toFixed(2)}</strong></div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Shift hours</th><th className="px-5 py-3">Payout</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{dayRows.map(row => {
            const employee = names.get(row.employee_id)
            const workedHours = Number(row.total_hours ?? 0)
            const amount = row.attendance_status === 'absent' ? 0 : workedHours * Number(employee?.hourly_rate ?? 0)
            return <tr key={row.id}>
              <td className="px-5 py-4 font-semibold text-[#12263f]">{employee?.full_name ?? 'Unknown employee'}</td>
              <td className="px-5 py-4">{locationNames.get(row.assigned_location_id ?? '') ?? 'Not assigned'}</td>
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
