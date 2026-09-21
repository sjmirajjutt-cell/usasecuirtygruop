'use client'

import { useEffect, useMemo, useState } from 'react'

type Payment = { id: string; period_start: string; period_end: string; total_hours: number; gross_amount: number; paid_at: string }

export function EmployeePayroll({ hourlyRate }: { hourlyRate: number }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const totalPaid = useMemo(() => payments.reduce((total, payment) => total + Number(payment.gross_amount || 0), 0), [payments])

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/payroll', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (response.ok) setPayments(result.payments ?? [])
      else setError(result.error ?? 'Payroll history could not be loaded.')
      setLoading(false)
    }
    void load()
  }, [])

  return <section className="panel mt-5 overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Payroll</span><h3>My payroll history</h3><p className="mt-1 text-sm font-normal text-slate-500">Paid payroll periods and your total earnings.</p></div></div><div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3"><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Paid periods</span><strong className="mt-1 block text-xl text-[#12263f]">{payments.length}</strong></div><div className="rounded-md bg-emerald-50 p-4"><span className="text-xs text-slate-500">Total paid</span><strong className="mt-1 block text-xl text-emerald-700">${totalPaid.toFixed(2)}</strong></div><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Current rate</span><strong className="mt-1 block text-xl text-[#12263f]">${hourlyRate.toFixed(2)}/hr</strong></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Period</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Paid amount</th><th className="px-6 py-3">Paid at</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map(payment => <tr key={payment.id}><td className="px-6 py-4">{payment.period_start} to {payment.period_end}</td><td className="px-6 py-4">{Number(payment.total_hours).toFixed(2)}</td><td className="px-6 py-4 font-semibold text-emerald-700">${Number(payment.gross_amount).toFixed(2)}</td><td className="px-6 py-4">{new Date(payment.paid_at).toLocaleString('en-US')}</td></tr>)}</tbody></table>{!loading && payments.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No paid payroll history yet.</p>}</div></section>
}
