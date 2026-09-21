'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

type Payment = { id: string; employee_id: string; period_start: string; period_end: string; total_hours: number; gross_amount: number; status: string; paid_at: string }
type PayrollRow = { employee: Profile; hours: number; amount: number; payment?: Payment }

function dateValue(date: Date) { return date.toISOString().slice(0, 10) }

function nextPayrollPeriod(periodEnd: string) {
  const nextStart = new Date(`${periodEnd}T00:00:00`)
  nextStart.setDate(nextStart.getDate() + 1)
  const nextEnd = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0)
  return { start: dateValue(nextStart), end: dateValue(nextEnd) }
}

export function PayrollManager({ employees, attendance, payments }: { employees: Profile[]; attendance: Attendance[]; payments: Payment[] }) {
  const today = new Date()
  const [periodStart, setPeriodStart] = useState(dateValue(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [periodEnd, setPeriodEnd] = useState(dateValue(today))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [paying, setPaying] = useState<string | null>(null)
    const [paymentRows, setPaymentRows] = useState(payments)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const rows = useMemo<PayrollRow[]>(() => employees.map(employee => {
    const employeeRows = attendance.filter(row => row.employee_id === employee.id && row.check_in.slice(0, 10) >= periodStart && row.check_in.slice(0, 10) <= periodEnd)
    const hours = employeeRows.reduce((total, row) => total + Number(row.total_hours ?? Math.max(0, (now - new Date(row.check_in).getTime()) / 3600000)), 0)
    const payment = paymentRows.find(item => item.employee_id === employee.id && item.period_start === periodStart && item.period_end === periodEnd)
    return { employee, hours: payment ? Number(payment.total_hours) : hours, amount: payment ? Number(payment.gross_amount) : hours * Number(employee.hourly_rate), payment }
  }), [employees, attendance, paymentRows, periodStart, periodEnd, now])

  const filteredRows = rows.filter(row => {
    const matchesSearch = !search || `${row.employee.full_name} ${row.employee.employee_id ?? ''}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (!status || status === 'paid' && row.payment || status === 'live' && !row.payment)
  })
  const liveTotal = filteredRows.filter(row => !row.payment).reduce((total, row) => total + row.amount, 0)
  const paidTotal = filteredRows.filter(row => row.payment).reduce((total, row) => total + row.amount, 0)

  async function markPaid(row: PayrollRow) {
    setPaying(row.employee.id); setMessage(''); setError('')
    try {
      const response = await fetch('/api/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: row.employee.id, periodStart, periodEnd, totalHours: row.hours, grossAmount: row.amount }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setError(result.error ?? 'Payroll could not be marked paid.')
      else {
        setPaymentRows(current => [result.payment, ...current])
        const nextPeriod = nextPayrollPeriod(periodEnd)
        setPeriodStart(nextPeriod.start)
        setPeriodEnd(nextPeriod.end)
        setStatus('live')
        setMessage(`Payroll marked paid for ${row.employee.full_name}. The next payroll period has started automatically.`)
      }
    } catch { setError('Payroll could not be updated. Check your connection.') } finally { setPaying(null) }
  }

  return <div className="space-y-5"><section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Payroll</span><h3>Live payroll</h3><p className="mt-1 text-sm font-normal text-slate-500">Review employee hours and mark each payroll period as paid.</p></div></div><div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-5"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employee" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><label className="text-xs font-bold text-slate-500">Period from<input type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-500">Period to<input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><select value={status} onChange={event => setStatus(event.target.value)} className="self-end rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All payroll</option><option value="live">Live unpaid</option><option value="paid">Paid</option></select><button type="button" onClick={() => { setPeriodStart(dateValue(new Date(today.getFullYear(), today.getMonth() + 1, 1))); setPeriodEnd(dateValue(new Date(today.getFullYear(), today.getMonth() + 2, 0))); setStatus('live') }} className="self-end rounded-md bg-[#12263f] px-3 py-2 text-sm font-bold text-white">Start next payroll</button></div>{error && <p className="m-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="m-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3"><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Employees</span><strong className="mt-1 block text-xl text-[#12263f]">{filteredRows.length}</strong></div><div className="rounded-md bg-amber-50 p-4"><span className="text-xs text-slate-500">Live unpaid total</span><strong className="mt-1 block text-xl text-amber-700">${liveTotal.toFixed(2)}</strong></div><div className="rounded-md bg-emerald-50 p-4"><span className="text-xs text-slate-500">Paid in period</span><strong className="mt-1 block text-xl text-emerald-700">${paidTotal.toFixed(2)}</strong></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Rate</th><th className="px-6 py-3">Payout</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map(row => <tr key={row.employee.id}><td className="px-6 py-4 font-semibold">{row.employee.full_name}<small className="block text-slate-400">{row.employee.employee_id || 'No ID'}</small></td><td className="px-6 py-4">{row.hours.toFixed(2)}</td><td className="px-6 py-4">${Number(row.employee.hourly_rate).toFixed(2)}</td><td className="px-6 py-4 font-semibold">${row.amount.toFixed(2)}</td><td className="px-6 py-4"><span className={row.payment ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{row.payment ? 'Paid' : 'Live'}</span></td><td className="px-6 py-4">{row.payment ? 'Moved to history' : <button type="button" onClick={() => void markPaid(row)} disabled={paying === row.employee.id} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{paying === row.employee.id ? 'Updating...' : 'Mark paid'}</button>}</td></tr>)}</tbody></table>{filteredRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payroll records match these filters.</p>}</div></section><section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Payroll history</span><h3>Completed payroll</h3></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">Period</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Paid amount</th><th className="px-6 py-3">Paid at</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map(payment => <tr key={payment.id}><td className="px-6 py-4 font-semibold">{employees.find(employee => employee.id === payment.employee_id)?.full_name ?? 'Unknown employee'}</td><td className="px-6 py-4">{payment.period_start} to {payment.period_end}</td><td className="px-6 py-4">{Number(payment.total_hours).toFixed(2)}</td><td className="px-6 py-4 font-semibold text-emerald-700">${Number(payment.gross_amount).toFixed(2)}</td><td className="px-6 py-4">{new Date(payment.paid_at).toLocaleString('en-US')}</td></tr>)}</tbody></table>{payments.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No payroll history yet.</p>}</div></section></div>
}
