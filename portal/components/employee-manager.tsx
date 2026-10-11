'use client'

import { FormEvent, useState } from 'react'
import type { Profile } from '@/lib/supabase/database.types'

export function EmployeeManager({ initialEmployees }: { initialEmployees: Profile[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const response = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
    const result = await response.json()
    if (!response.ok) setError(result.error ?? 'Unable to create employee')
    else {
      setMessage(`Employee ${result.employeeId} added.`)
      formElement.reset()
      window.location.reload()
    }
    setLoading(false)
  }

  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <section className="panel p-6"><div><span className="section-kicker">New employee</span><h3 className="mt-2 text-lg font-bold text-[#12263f]">Add field staff</h3><p className="mt-1 text-sm text-slate-500">Add employee details without setting up a login.</p></div><form onSubmit={createEmployee} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Full name<input name="fullName" required className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-600">Employee ID<input name="employeeId" required placeholder="USSPG-001" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Phone<input name="phone" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-600">Hourly rate<input name="hourlyRate" required min="0" step="0.01" type="number" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label></div><label className="block text-xs font-bold text-slate-600">Address<textarea name="address" rows={2} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label>{error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}<button disabled={loading} className="w-full rounded-md bg-[#12263f] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Creating employee...' : 'Add employee'}</button></form></section>
    <section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Roster</span><h3>Employees</h3></div><span className="text-sm text-slate-400">{employees.length} total</span></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Employee</th><th className="px-6 py-3">ID</th><th className="px-6 py-3">Rate</th><th className="px-6 py-3">Employee status</th></tr></thead><tbody className="divide-y divide-slate-100">{employees.map(employee => <tr key={employee.id}><td className="px-6 py-4"><strong className="block text-[#12263f]">{employee.full_name}</strong><small className="text-slate-400">{employee.phone || 'No phone'}</small></td><td className="px-6 py-4 font-semibold">{employee.employee_id || 'Not assigned'}</td><td className="px-6 py-4">${Number(employee.hourly_rate).toFixed(2)}</td><td className="px-6 py-4"><span className={employee.is_active ? 'text-emerald-600' : 'text-red-500'}>{employee.is_active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table>{employees.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No employees added yet.</p>}</div></section>
  </div></div>
}