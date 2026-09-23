'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

type Payment = { id: string; employee_id: string; period_start: string; period_end: string; total_hours: number; gross_amount: number; status: string; paid_at: string }
type PayrollRow = { employee: Profile; hours: number; amount: number; attendanceIds: string[]; payment?: Payment }
type Filters = { search: string; status: string; from: string; to: string }
const emptyFilters: Filters = { search: '', status: '', from: '', to: '' }
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function nextPayrollPeriod(periodEnd: string) {
  const start = new Date(`${periodEnd}T00:00:00`)
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date()
    return { start: dateValue(new Date(fallback.getFullYear(), fallback.getMonth(), 1)), end: dateValue(fallback) }
  }
  start.setDate(start.getDate() + 1)
  return { start: dateValue(start), end: dateValue(new Date(start.getFullYear(), start.getMonth() + 1, 0)) }
}

function getLatestPaidPeriod(payments: Payment[]) {
  if (!payments.length) return null
  return [...payments].sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0]
}

function getInitialPayrollPeriod(payments: Payment[], today = new Date()) {
  const todayValue = dateValue(today)
  const latestPaidPeriod = getLatestPaidPeriod(payments.filter(payment => payment.period_end <= todayValue))
  if (!latestPaidPeriod) {
    return { start: dateValue(new Date(today.getFullYear(), today.getMonth(), 1)), end: dateValue(today) }
  }
  return nextPayrollPeriod(latestPaidPeriod.period_end)
}

export function PayrollManager({ employees, attendance, payments }: { employees: Profile[]; attendance: Attendance[]; payments: Payment[] }) {
  const safeEmployees = Array.isArray(employees) ? employees : []
  const safeAttendance = Array.isArray(attendance) ? attendance : []
  const safePayments = Array.isArray(payments) ? payments : []
  const today = new Date()
  const initialPeriod = getInitialPayrollPeriod(safePayments, today)
  const [periodStart, setPeriodStart] = useState(initialPeriod.start)
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.end)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [attendanceRows, setAttendanceRows] = useState(safeAttendance)
  const [paymentRows, setPaymentRows] = useState(safePayments)
  const [now, setNow] = useState(Date.now())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [paying, setPaying] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const refresh = async () => {
      try {
        const [attendanceResponse, payrollResponse] = await Promise.all([fetch('/api/attendance', { cache: 'no-store' }), fetch('/api/payroll', { cache: 'no-store' })])
        if (attendanceResponse.ok) setAttendanceRows((await attendanceResponse.json()).attendance ?? [])
        if (payrollResponse.ok) {
          const refreshedPayments = (await payrollResponse.json()).payments ?? []
          setPaymentRows(refreshedPayments)
            const latestPaidPeriod = getLatestPaidPeriod(refreshedPayments.filter((payment: Payment) => payment.period_end <= dateValue(new Date())))
          if (latestPaidPeriod) {
            const next = nextPayrollPeriod(latestPaidPeriod.period_end)
            setPeriodStart(current => current === next.start && periodEnd === next.end ? current : next.start)
            setPeriodEnd(current => current === next.end && periodStart === next.start ? current : next.end)
          }
        }
      } catch {
        setError('Live payroll refresh is temporarily unavailable.')
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 10000)
    return () => window.clearInterval(timer)
  }, [periodEnd, periodStart])

  const rows = useMemo<PayrollRow[]>(() => safeEmployees.map(employee => {
    const shifts = attendanceRows.filter(row => {
      const shiftDate = dateValue(new Date(row.check_in))
      const isActiveShift = !row.check_out
      return row.employee_id === employee.id && row.is_paid !== true && (isActiveShift || (shiftDate >= periodStart && shiftDate <= periodEnd))
    })
    const hours = shifts.reduce((total, row) => {
      const start = new Date(row.paid_at ?? row.check_in).getTime()
      const end = row.check_out ? new Date(row.check_out).getTime() : now
      return total + Math.max(0, (end - start) / 3600000)
    }, 0)
    const paymentRecord = paymentRows.find(item => item.employee_id === employee.id && item.period_start === periodStart && item.period_end === periodEnd)
    const payment = shifts.length === 0 ? paymentRecord : undefined
    return { employee, hours: payment ? Number(payment.total_hours) : hours, amount: payment ? Number(payment.gross_amount) : hours * Number(employee.hourly_rate), attendanceIds: shifts.map(shift => shift.id), payment }
  }), [safeEmployees, attendanceRows, paymentRows, periodStart, periodEnd, now])

  const liveRows = rows.filter(row => !row.payment)
  const paidRows = paymentRows.filter(payment => payment.period_start === periodStart && payment.period_end === periodEnd)

  const filteredRows = liveRows.filter(row => {
    const text = `${row.employee.full_name} ${row.employee.employee_id ?? ''}`.toLowerCase()
    return (!filters.search || text.includes(filters.search.toLowerCase())) && (!filters.status || filters.status === 'live') && (!filters.from || periodStart >= filters.from) && (!filters.to || periodEnd <= filters.to)
  })
  const liveTotal = filteredRows.reduce((total, row) => total + row.amount, 0)
  const paidTotal = paidRows.reduce((total, payment) => total + Number(payment.gross_amount || 0), 0)

  function setFilter(key: keyof Filters, value: string) { setFilters(current => ({ ...current, [key]: value })) }

  async function markPaid(row: PayrollRow) {
    setPaying(row.employee.id); setError(''); setMessage('')
    try {
      const response = await fetch('/api/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: row.employee.id, periodStart, periodEnd, totalHours: row.hours, grossAmount: row.amount, attendanceIds: row.attendanceIds }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setError(result.error ?? 'Payroll could not be marked paid.')
      else {
        const next = nextPayrollPeriod(periodEnd)
        setAttendanceRows(current => current.map(attendance => {
          if (!row.attendanceIds.includes(attendance.id)) return attendance
          return attendance.check_out ? { ...attendance, is_paid: true } : { ...attendance, is_paid: false, paid_at: result.paidAt }
        }))
        setPaymentRows(current => [result.payment, ...current.filter(payment => payment.id !== result.payment.id)])
        setPeriodStart(next.start); setPeriodEnd(next.end); setFilters(emptyFilters)
        setMessage(`Payroll marked paid for ${row.employee.full_name}. The next payroll period started automatically.`)
      }
    } catch { setError('Payroll could not be updated. Check your connection.') } finally { setPaying(null) }
  }

  return <div className="space-y-5">
    <section className="panel overflow-hidden">
      <div className="panel-heading"><div><span className="section-kicker">Payroll</span><h3>Live payroll</h3><p className="mt-1 text-sm font-normal text-slate-500">The next payroll period starts automatically after payment.</p></div></div>
      <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4"><input value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Search employee" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><label className="text-xs font-bold text-slate-500">Period from<input type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-500">Period to<input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><select value={filters.status} onChange={event => setFilter('status', event.target.value)} className="self-end rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All payroll</option><option value="live">Live unpaid</option><option value="paid">Paid</option></select></div>
      {error && <p className="m-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="m-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3"><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Employees</span><strong className="mt-1 block text-xl text-[#12263f]">{filteredRows.length}</strong></div><div className="rounded-md bg-amber-50 p-4"><span className="text-xs text-slate-500">Live unpaid total</span><strong className="mt-1 block text-xl text-amber-700">${liveTotal.toFixed(2)}</strong></div><div className="rounded-md bg-emerald-50 p-4"><span className="text-xs text-slate-500">Paid in period</span><strong className="mt-1 block text-xl text-emerald-700">${paidTotal.toFixed(2)}</strong></div></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Rate</th><th className="px-6 py-3">Payout</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map(row => <tr key={row.employee.id}><td className="px-6 py-4 font-semibold">{row.employee.full_name || 'Unknown employee'}<small className="block text-slate-400">{row.employee.employee_id || 'No ID'}</small></td><td className="px-6 py-4">{Number(row.hours || 0).toFixed(2)}</td><td className="px-6 py-4">${Number(row.employee.hourly_rate || 0).toFixed(2)}</td><td className="px-6 py-4 font-semibold">${Number(row.amount || 0).toFixed(2)}</td><td className="px-6 py-4"><span className={row.payment ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{row.payment ? 'Paid' : 'Live'}</span></td><td className="px-6 py-4">{row.payment ? 'Moved to history' : <button type="button" onClick={() => void markPaid(row)} disabled={paying === row.employee.id || row.hours <= 0} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{paying === row.employee.id ? 'Updating...' : row.hours <= 0 ? 'No payable hours' : 'Mark paid'}</button>}</td></tr>)}</tbody></table>{filteredRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payroll records match these filters.</p>}</div>
    </section>
    <section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Payroll history</span><h3>Completed payroll</h3></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Period</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Paid amount</th><th className="px-6 py-3">Paid at</th></tr></thead><tbody className="divide-y divide-slate-100">{paymentRows.map(payment => <tr key={payment.id}><td className="px-6 py-4 font-semibold">{safeEmployees.find(employee => employee.id === payment.employee_id)?.full_name ?? 'Unknown employee'}</td><td className="px-6 py-4">{payment.period_start} to {payment.period_end}</td><td className="px-6 py-4">{Number(payment.total_hours || 0).toFixed(2)}</td><td className="px-6 py-4 font-semibold text-emerald-700">${Number(payment.gross_amount || 0).toFixed(2)}</td><td className="px-6 py-4">{payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-US') : 'Unknown'}</td></tr>)}</tbody></table>{paymentRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payroll history yet.</p>}</div></section>
  </div>
}
