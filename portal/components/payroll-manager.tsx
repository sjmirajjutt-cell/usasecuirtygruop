'use client'

import { useMemo, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

type Period = 'daily' | 'weekly' | 'monthly'
type PayrollRow = { employee: Profile; shifts: Attendance[]; hours: number; amount: number }
type PayrollPayment = { id: string; employee_id: string; period_start: string; period_end: string; total_hours: number; gross_amount: number; status: 'paid' | 'unpaid'; paid_at: string }

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

export function PayrollManager({ employees, attendance, payments: initialPayments }: { employees: Profile[]; attendance: Attendance[]; payments: PayrollPayment[] }) {
  const [period, setPeriod] = useState<Period>('weekly')
  const [shiftRecords, setShiftRecords] = useState(attendance)
  const [payments, setPayments] = useState(initialPayments)
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const range = getPeriodRange(period)

  const rows = useMemo<PayrollRow[]>(() => employees.map(employee => {
    const shifts = shiftRecords.filter(row => {
      const shiftDate = row.check_in.slice(0, 10)
      return row.employee_id === employee.id
        && row.attendance_status !== 'absent'
        && Number(row.total_hours ?? 0) > 0
        && shiftDate >= range.start
        && shiftDate <= range.end
    })
    const hours = shifts.reduce((total, shift) => total + Math.max(0, Number(shift.total_hours ?? 0)), 0)

    return {
      employee,
      shifts,
      hours,
      amount: hours * Number(employee.hourly_rate ?? 0)
    }
  }), [employees, shiftRecords, range.start, range.end])

  const totalHours = rows.reduce((total, row) => total + row.hours, 0)
  const totalPayout = rows.reduce((total, row) => total + row.amount, 0)

  async function updatePaymentStatus(row: PayrollRow) {
    const periodPayments = payments.filter(payment => payment.employee_id === row.employee.id && payment.period_start === range.start && payment.period_end === range.end)
    const isPaid = row.shifts.length > 0
      ? row.shifts.every(shift => shift.is_paid)
      : periodPayments.some(payment => payment.status === 'paid')
    const unpaidShifts = row.shifts.filter(shift => !shift.is_paid)
    setSavingEmployeeId(row.employee.id)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/payroll', {
        method: isPaid ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPaid
          ? { employeeId: row.employee.id, periodStart: range.start, periodEnd: range.end }
          : {
              employeeId: row.employee.id,
              periodStart: range.start,
              periodEnd: range.end,
              totalHours: unpaidShifts.reduce((total, shift) => total + Number(shift.total_hours ?? 0), 0),
              grossAmount: unpaidShifts.reduce((total, shift) => total + Number(shift.total_hours ?? 0) * Number(row.employee.hourly_rate ?? 0), 0),
              attendanceIds: unpaidShifts.map(shift => shift.id)
            })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to update payroll status.')

      const updatedAt = new Date().toISOString()
      const updatedIds = new Set(isPaid ? row.shifts.map(shift => shift.id) : unpaidShifts.map(shift => shift.id))
      setShiftRecords(current => current.map(shift => updatedIds.has(shift.id)
        ? { ...shift, is_paid: !isPaid, paid_at: isPaid ? null : updatedAt }
        : shift))
      if (isPaid) {
        setPayments(current => current.map(payment => periodPayments.some(periodPayment => periodPayment.id === payment.id)
          ? { ...payment, status: 'unpaid' }
          : payment))
      } else {
        const createdPayment = result.payment as PayrollPayment
        setPayments(current => [...current, createdPayment])
      }
      setMessage(`${row.employee.full_name} marked ${isPaid ? 'unpaid' : 'paid'}.`)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update payroll status.')
    } finally {
      setSavingEmployeeId(null)
    }
  }

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

      {(message || error) && <p role={error ? 'alert' : 'status'} className={`mx-5 mt-4 rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</p>}

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
              <th className="px-6 py-3">Payment status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => {
              const rowPayments = payments.filter(payment => payment.employee_id === row.employee.id && payment.period_start === range.start && payment.period_end === range.end)
              const paidCount = row.shifts.filter(shift => shift.is_paid).length
              const isPaid = row.shifts.length > 0 ? paidCount === row.shifts.length : rowPayments.some(payment => payment.status === 'paid')
              const isPartiallyPaid = row.shifts.length > 0 && paidCount > 0 && !isPaid
              return (
              <tr key={row.employee.id}>
                <td className="px-6 py-4 font-semibold text-[#12263f]">
                  {row.employee.full_name || 'Unknown employee'}
                  <small className="block text-slate-400">{row.employee.employee_id || 'No ID'}</small>
                </td>
                <td className="px-6 py-4">{row.hours.toFixed(2)}</td>
                <td className="px-6 py-4">${Number(row.employee.hourly_rate || 0).toFixed(2)}</td>
                <td className="px-6 py-4 font-semibold text-[#12263f]">${row.amount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isPaid ? 'bg-emerald-50 text-emerald-700' : isPartiallyPaid ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {isPaid ? 'Paid' : isPartiallyPaid ? 'Partially paid' : 'Unpaid'}
                    </span>
                    <button type="button" disabled={savingEmployeeId !== null} onClick={() => updatePaymentStatus(row)} className={`rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${isPaid ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'bg-[#12263f] text-white hover:bg-[#1b3c5e]'}`}>
                      {savingEmployeeId === row.employee.id ? 'Updating…' : isPaid ? 'Mark unpaid' : isPartiallyPaid ? 'Mark remaining paid' : 'Mark as paid'}
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Add an employee to see shift hours and payout.</p>}
        {rows.length > 0 && totalHours === 0 && <p className="p-8 text-center text-sm text-slate-500">No shift hours recorded for this period.</p>}
      </div>
    </section>
  )
}
