'use client'

import { FormEvent, useState } from 'react'
import type { Profile, WorkLocation } from '@/lib/supabase/database.types'

export function EmployeeManagerSimple({ initialEmployees, locations }: { initialEmployees: Profile[]; locations: WorkLocation[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form))
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Employee could not be added.')
        return
      }
      setMessage(`Employee ${result.employeeId} added successfully.`)
      window.location.reload()
    } catch {
      setError('Employee could not be added. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const locationNames = new Map(locations.map(location => [location.id, location.location_name]))

  return <div className="grid gap-5 xl:grid-cols-[minmax(300px,.75fr)_minmax(0,1.25fr)]">
    <section className="panel p-6">
      <span className="section-kicker">Step 1</span>
      <h3 className="mt-2 text-lg font-bold text-[#12263f]">Add an employee</h3>
      <p className="mt-1 text-sm text-slate-500">Just the details needed to set up their work and pay.</p>
      <form onSubmit={createEmployee} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Name
          <input name="fullName" required autoComplete="name" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Employee ID
          <input name="employeeId" required placeholder="USSPG-001" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Hourly rate ($)
          <input name="hourlyRate" required min="0" step="0.01" type="number" defaultValue="0" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Assigned location
          <select name="assignedLocationId" defaultValue="" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 font-normal">
            <option value="">No location assigned</option>
            {locations.map(location => <option key={location.id} value={location.id}>{location.location_name}</option>)}
          </select>
          {locations.length === 0 && <span className="mt-1 block text-xs font-normal text-amber-700">No locations are set up yet. <a href="/dashboard/locations" className="font-semibold underline">Add a location</a> first, or leave this unassigned for now.</span>}
        </label>
        <details open className="rounded-md border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Employee sign-in details</summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Login email
              <input name="email" required type="email" autoComplete="email" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Temporary password
              <input name="password" required minLength={8} type="password" autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2.5 font-normal" />
            </label>
            <p className="text-xs text-slate-500">Required so this employee can sign in to their staff account.</p>
          </div>
        </details>
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        <button disabled={loading} className="w-full rounded-md bg-[#12263f] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          {loading ? 'Adding employee…' : 'Add employee'}
        </button>
      </form>
    </section>

    <section className="panel overflow-hidden">
      <div className="panel-heading"><div><span className="section-kicker">Your team</span><h3>Employees</h3></div><span className="text-sm text-slate-500">{employees.length} total</span></div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Employee ID</th><th className="px-5 py-3">Hourly rate</th><th className="px-5 py-3">Location</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{employees.map(employee => <tr key={employee.id}>
            <td className="px-5 py-4 font-semibold text-[#12263f]">{employee.full_name}</td>
            <td className="px-5 py-4">{employee.employee_id || '—'}</td>
            <td className="px-5 py-4">${Number(employee.hourly_rate).toFixed(2)}</td>
            <td className="px-5 py-4">{locationNames.get(employee.assigned_location_id ?? '') || 'Not assigned'}</td>
          </tr>)}</tbody>
        </table>
        {employees.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Add your first employee using the form.</p>}
      </div>
    </section>
  </div>
}
