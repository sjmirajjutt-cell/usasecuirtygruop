'use client'

import { useMemo, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

type Period = 'daily' | 'weekly' | 'monthly'
type PayrollRow = { employee: Profile; hours: number; amount: number }

const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function getPeriodRange(period: Period, referenceDate = new Date()) {
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const start = new Date(end)

  if (period === 'weekly') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  } else if (period === 'monthly') {
    start.setDate(1)
  }

  return { start: dateValue(start), end: dateValue(end) }
}

export function PayrollManager({ employees, attendance }: { employees: Profile[]; attendance: Attendance[] }) {
  const [period, setPeriod] = useState<Period>('weekly')
  const range = getPeriodRange(period)

  const rows = useMemo<PayrollRow[]>(() => employees.map(employee => {
    const shifts = attendance.filter(row => {
      const shiftDate = row.check_in.slice(0, 10)
      return row.employee_id === employee.id
        && row.attendance_status !== 'absent'
        && row.total_hours !== null
        && shiftDate >= range.start
        && shiftDate <= range.end
    })
    const hours = shifts.reduce((total, shift) => total + Math.max(0, Number(shift.total_hours ?? 0)), 0)

    return {
      employee,
      hours,
      amount: hours * Number(employee.hourly_rate ?? 0)
    }
  }), [employees, attendance, range.start, range.end])

  const totalHours = rows.reduce((total, row) => total + row.hours, 0)
  const totalPayout = rows.reduce((total, row) => total + row.amount, 0)

  const periods: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ]

  return (
    <section className="panel overflow-hidden">
      <div className="panel-heading">
        <div>
          <h3>Shift hours and payout</h3>
          <p className="mt-1 text-sm font-normal text-slate-500">Payout is calculated from recorded shift hours and each employee’s hourly rate.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 pb-4">
        {periods.map(option => (
          <button
            key={option.value}
            type="button"
            aria-pressed={period === option.value}
            onClick={() => setPeriod(option.value)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${period === option.value ? 'border-[#12263f] bg-[#12263f] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-slate-500">
          {range.start === range.end ? range.start : `${range.start} — ${range.end}`}
        </span>
      </div>

      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Employees</span>
          <strong className="mt-2 block text-2xl text-[#12263f]">{employees.length}</strong>
        </div>
        <div className="rounded-2xl bg-[#edf6ff] p-4">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#4b98cf]">Shift hours</span>
          <strong className="mt-2 block text-2xl text-[#12263f]">{totalHours.toFixed(2)}</strong>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Total payout</span>
          <strong className="mt-2 block text-2xl text-emerald-700">${totalPayout.toFixed(2)}</strong>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Employee</th>
              <th className="px-6 py-3">Shift hours</th>
              <th className="px-6 py-3">Hourly rate</th>
              <th className="px-6 py-3">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.employee.id}>
                <td className="px-6 py-4 font-semibold text-[#12263f]">
                  {row.employee.full_name || 'Unknown employee'}
                  <small className="block text-slate-400">{row.employee.employee_id || 'No ID'}</small>
                </td>
                <td className="px-6 py-4">{row.hours.toFixed(2)}</td>
                <td className="px-6 py-4">${Number(row.employee.hourly_rate || 0).toFixed(2)}</td>
                <td className="px-6 py-4 font-semibold text-[#12263f]">${row.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Add an employee to see shift hours and payout.</p>}
        {rows.length > 0 && totalHours === 0 && <p className="p-8 text-center text-sm text-slate-500">No shift hours recorded for this period.</p>}
      </div>
    </section>
  )
}
