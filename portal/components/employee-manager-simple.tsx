'use client'

import { FormEvent, useState } from 'react'
import type { Profile, WorkLocation } from '@/lib/supabase/database.types'
import FreeMapPicker from '@/components/FreeMapPicker'

type MapSelection = { lat: number; lng: number; address: string; locationName?: string }

export function EmployeeManagerSimple({ initialEmployees, locations }: { initialEmployees: Profile[]; locations: WorkLocation[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [locationName, setLocationName] = useState('')
  const [mapSelection, setMapSelection] = useState<MapSelection | null>(null)
  const savedLocation = locations.find(location => location.location_name.trim().toLowerCase() === locationName.trim().toLowerCase())
  const savedMapLocation = savedLocation?.latitude !== null && savedLocation?.latitude !== undefined
    && savedLocation.longitude !== null && savedLocation.longitude !== undefined
    ? {
        lat: savedLocation.latitude,
        lng: savedLocation.longitude,
        address: savedLocation.address,
        locationName: savedLocation.location_name
      }
    : null

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const normalizedLocationName = locationName.trim()
    const matchingLocation = locations.find(location => location.location_name.trim().toLowerCase() === normalizedLocationName.toLowerCase())
    if (normalizedLocationName && !matchingLocation && !mapSelection) {
      setError('Select the work site on the map before adding this employee.')
      return
    }

    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          assignedLocationId: matchingLocation?.id ?? null,
          newLocation: normalizedLocationName && !matchingLocation && mapSelection
            ? {
                locationName: normalizedLocationName,
                address: mapSelection.address,
                latitude: mapSelection.lat,
                longitude: mapSelection.lng
              }
            : null
        })
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

  return <div className="space-y-5">
    <section className="panel p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <span className="section-kicker">Step 1</span>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.04em] text-[#12263f]">Add employee</h3>
        </div>
        <div className="rounded-full bg-[#edf6ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#4b98cf]">
          {employees.length} staff
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Employees</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{employees.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Work locations</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{locations.length}</p>
        </div>
      </div>

      <p className="mb-5 text-sm text-slate-500">Enter the employee details, hourly rate, and work location.</p>

      <form onSubmit={createEmployee} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">Name
            <input name="fullName" required autoComplete="name" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Employee ID
            <input name="employeeId" required placeholder="USSPG-001" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">Hourly rate ($)
            <input name="hourlyRate" required min="0" step="0.01" type="number" defaultValue="0" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Work location
            <input
              value={locationName}
              onChange={event => {
                setLocationName(event.target.value)
                const nextSavedLocation = locations.find(location => location.location_name.trim().toLowerCase() === event.target.value.trim().toLowerCase())
                setMapSelection(nextSavedLocation?.latitude !== null && nextSavedLocation?.latitude !== undefined
                  && nextSavedLocation.longitude !== null && nextSavedLocation.longitude !== undefined
                  ? { lat: nextSavedLocation.latitude, lng: nextSavedLocation.longitude, address: nextSavedLocation.address, locationName: nextSavedLocation.location_name }
                  : null)
              }}
              list="employee-work-locations"
              placeholder="Type or choose a location"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10"
            />
            <datalist id="employee-work-locations">
              {locations.map(location => <option key={location.id} value={location.location_name} />)}
            </datalist>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Verify the location on the map</p>
          <p className="mt-1 text-xs text-slate-500">Search for the address or move the pin to the exact work site.</p>
          <div className="mt-3">
            <FreeMapPicker onLocationSelect={setMapSelection} initialLocation={savedMapLocation} />
          </div>
          {mapSelection && <p className="mt-2 rounded-xl bg-white p-3 text-xs text-slate-600"><strong>Map point selected:</strong> {mapSelection.address}</p>}
        </div>

        {locationName.trim() && !locations.some(location => location.location_name.trim().toLowerCase() === locationName.trim().toLowerCase()) && !mapSelection && <span className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">Choose this new work location on the map to save its GPS point.</span>}

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

        <button disabled={loading} className="w-full rounded-xl bg-[#12263f] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#12263f]/15 transition hover:bg-[#0f1c2d] disabled:cursor-not-allowed disabled:opacity-60">
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
