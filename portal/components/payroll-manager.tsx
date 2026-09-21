'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

type Payment = { id: string; employee_id: string; period_start: string; period_end: string; total_hours: number; gross_amount: number; status: string; paid_at: string }
type PayrollRow = { employee: Profile; hours: number; amount: number; payment?: Payment }
type Filters = { search: string; status: string; from: string; to: string }
const emptyFilters: Filters = { search: '', status: '', from: '', to: '' }
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function nextPayrollPeriod(periodEnd: string) {
  const start = new Date(`${periodEnd}T00:00:00`)
  start.setDate(start.getDate() + 1)
  return { start: dateValue(start), end: dateValue(new Date(start.getFullYear(), start.getMonth() + 1, 0)) }
}

export function PayrollManager({ employees, attendance, payments }: { employees: Profile[]; attendance: Attendance[]; payments: Payment[] }) {
  const today = new Date()
  const initialPeriod = payments[0] ? nextPayrollPeriod(payments[0].period_end) : { start: dateValue(new Date(today.getFullYear(), today.getMonth(), 1)), end: dateValue(today) }
  const [periodStart, setPeriodStart] = useState(initialPeriod.start)
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.end)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [attendanceRows, setAttendanceRows] = useState(attendance)
  const [paymentRows, setPaymentRows] = useState(payments)
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
      const [attendanceResponse, payrollResponse] = await Promise.all([fetch('/api/attendance', { cache: 'no-store' }), fetch('/api/payroll', { cache: 'no-store' })])
      if (attendanceResponse.ok) setAttendanceRows((await attendanceResponse.json()).attendance ?? [])
      if (payrollResponse.ok) setPaymentRows((await payrollResponse.json()).payments ?? [])
    }
    void refresh()
    const timer = window.setInterval(refresh, 10000)
    return () => window.clearInterval(timer)
  }, [])

  const rows = useMemo<PayrollRow[]>(() => employees.map(employee => {
    const shifts = attendanceRows.filter(row => {
      const shiftDate = dateValue(new Date(row.check_in))
      return row.employee_id === employee.id && shiftDate >= periodStart && shiftDate <= periodEnd
    })
    const hours = shifts.reduce((total, row) => total + Number(row.total_hours ?? Math.max(0, (now - new Date(row.check_in).getTime()) / 3600000)), 0)
    const payment = paymentRows.find(item => item.employee_id === employee.id && item.period_start === periodStart && item.period_end === periodEnd)
    return { employee, hours: payment ? Number(payment.total_hours) : hours, amount: payment ? Number(payment.gross_amount) : hours * Number(employee.hourly_rate), payment }
  }), [employees, attendanceRows, paymentRows, periodStart, periodEnd, now])

  const filteredRows = rows.filter(row => {
    const text = `${row.employee.full_name} ${row.employee.employee_id ?? ''}`.toLowerCase()
    return (!filters.search || text.includes(filters.search.toLowerCase())) && (!filters.status || filters.status === (row.payment ? 'paid' : 'live')) && (!filters.from || periodStart >= filters.from) && (!filters.to || periodEnd <= filters.to)
  })
  const liveTotal = filteredRows.filter(row => !row.payment).reduce((total, row) => total + row.amount, 0)
  const paidTotal = filteredRows.filter(row => row.payment).reduce((total, row) => total + row.amount, 0)

  function setFilter(key: keyof Filters, value: string) { setFilters(current => ({ ...current, [key]: value })) }

  async function markPaid(row: PayrollRow) {
    setPaying(row.employee.id); setError(''); setMessage('')
    try {
      const response = await fetch('/api/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: row.employee.id, periodStart, periodEnd, totalHours: row.hours, grossAmount: row.amount }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setError(result.error ?? 'Payroll could not be marked paid.')
      else {
        setPaymentRows(current => [result.payment, ...current])
        const next = nextPayrollPeriod(periodEnd)
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
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Rate</th><th className="px-6 py-3">Payout</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map(row => <tr key={row.employee.id}><td className="px-6 py-4 font-semibold">{row.employee.full_name}<small className="block text-slate-400">{row.employee.employee_id || 'No ID'}</small></td><td className="px-6 py-4">{row.hours.toFixed(2)}</td><td className="px-6 py-4">${Number(row.employee.hourly_rate).toFixed(2)}</td><td className="px-6 py-4 font-semibold">${row.amount.toFixed(2)}</td><td className="px-6 py-4"><span className={row.payment ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{row.payment ? 'Paid' : 'Live'}</span></td><td className="px-6 py-4">{row.payment ? 'Moved to history' : <button type="button" onClick={() => void markPaid(row)} disabled={paying === row.employee.id || row.hours <= 0} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{paying === row.employee.id ? 'Updating...' : row.hours <= 0 ? 'No payable hours' : 'Mark paid'}</button>}</td></tr>)}</tbody></table>{filteredRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payroll records match these filters.</p>}</div>
    </section>
    <section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Payroll history</span><h3>Completed payroll</h3></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Period</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Paid amount</th><th className="px-6 py-3">Paid at</th></tr></thead><tbody className="divide-y divide-slate-100">{paymentRows.map(payment => <tr key={payment.id}><td className="px-6 py-4 font-semibold">{employees.find(employee => employee.id === payment.employee_id)?.full_name ?? 'Unknown employee'}</td><td className="px-6 py-4">{payment.period_start} to {payment.period_end}</td><td className="px-6 py-4">{Number(payment.total_hours).toFixed(2)}</td><td className="px-6 py-4 font-semibold text-emerald-700">${Number(payment.gross_amount).toFixed(2)}</td><td className="px-6 py-4">{new Date(payment.paid_at).toLocaleString('en-US')}</td></tr>)}</tbody></table>{paymentRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payroll history yet.</p>}</div></section>
  </div>
}
