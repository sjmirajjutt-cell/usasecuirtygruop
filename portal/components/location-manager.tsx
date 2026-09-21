'use client'

import { useState } from 'react'
import type { Client, Profile, WorkLocation } from '@/lib/supabase/database.types'
import FreeMapPicker from '@/components/FreeMapPicker'

type SelectedLocation = { lat: number; lng: number; address: string; locationName?: string }

export function LocationManager({ initialEmployees, initialLocations, initialClients }: { initialEmployees: Profile[]; initialLocations: WorkLocation[]; initialClients: Client[] }) {
  const [employees, setEmployees] = useState(initialEmployees)
  const [locations, setLocations] = useState(initialLocations)
  const [clients, setClients] = useState(initialClients)
  const [selected, setSelected] = useState<SelectedLocation | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [showClientForm, setShowClientForm] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [clientForm, setClientForm] = useState({ name: '', addressLine1: '', addressLine2: '', phone: '', email: '' })
  const [locationName, setLocationName] = useState('')
  const [allowedRadius, setAllowedRadius] = useState('150')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  async function saveClient() {
    setSavingClient(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientForm) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error ?? `Client could not be saved (${response.status}).`)
        return
      }
      setClients(current => [...current, result.client].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedClientId(result.client.id)
      setClientForm({ name: '', addressLine1: '', addressLine2: '', phone: '', email: '' })
      setShowClientForm(false)
      setMessage('Client saved. You can now save the location.')
    } catch {
      setError('Client could not be saved. Check your login and internet connection.')
    } finally {
      setSavingClient(false)
    }
  }

  async function createLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setMessage(''); setError('')
    if (!selected) { setError('Search for or select a location on the map first.'); setSaving(false); return }

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const nextLocationName = String(form.get('locationName') ?? '').trim() || selected.locationName || selected.address.split(',')[0].trim() || 'Work Location'
    if (nextLocationName) setLocationName(nextLocationName)

    try {
      const response = await fetch('/api/locations', {
        method: editingLocationId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(form), locationId: editingLocationId, locationName: nextLocationName, clientId: selectedClientId, allowedRadiusMeters: allowedRadius, latitude: selected.lat, longitude: selected.lng, address: selected.address })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setError(result.error ?? `Location could not be saved (${response.status}).`)
      else { setLocations(current => [...current.filter(location => location.id !== result.location.id), result.location].sort((a, b) => a.location_name.localeCompare(b.location_name))); setMessage(editingLocationId ? 'Location updated.' : 'Location saved. You can now assign a guard.'); formElement.reset(); setLocationName(''); setAllowedRadius('150'); setSelectedClientId(''); setSelected(null); setEditingLocationId(null) }
    } catch {
      setError('Location could not be saved. Check your login and internet connection.')
    } finally {
      setSaving(false)
    }
  }

  function editLocation(location: WorkLocation) {
    setEditingLocationId(location.id)
    setLocationName(location.location_name)
    setSelectedClientId(location.client_id ?? '')
    setAllowedRadius(String(location.allowed_radius_meters))
    if (location.latitude !== null && location.longitude !== null) setSelected({ lat: location.latitude, lng: location.longitude, address: location.address, locationName: location.location_name })
    setMessage('Edit mode is active. Update the values and save the location.')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingLocationId(null); setLocationName(''); setAllowedRadius('150'); setSelectedClientId(''); setSelected(null); setMessage('')
  }

  async function assignLocation(employeeId: string, locationId: string) {
    setAssigning(employeeId); setError(''); setMessage('')
    const response = await fetch('/api/locations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId, locationId: locationId || null }) })
    const result = await response.json()
    if (!response.ok) setError(result.error ?? 'Assignment could not be saved.')
    else { setEmployees(current => current.map(employee => employee.id === employeeId ? { ...employee, assigned_location_id: locationId || null } : employee)); setMessage('Guard location assignment updated.') }
    setAssigning(null)
  }

  return <div className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
      <section className="panel p-6">
        <span className="section-kicker">Location setup</span>
        <h3 className="mt-2 text-lg font-bold text-[#12263f]">Add a work location</h3>
        <p className="mt-1 text-sm text-slate-500">Search or drag the map marker to select the exact site.</p>
        <form onSubmit={createLocation} className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-slate-600">Location name<input name="locationName" value={locationName} onChange={event => setLocationName(event.target.value)} required placeholder="Downtown Security Site" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          <div className="space-y-2"><label className="block text-xs font-bold text-slate-600">Saved client<select name="clientId" value={selectedClientId} onChange={event => setSelectedClientId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Choose a saved client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><button type="button" onClick={() => setShowClientForm(value => !value)} className="text-xs font-bold text-[#2d8fd5]">{showClientForm ? 'Close add client' : '+ Add client here'}</button></div>
          {showClientForm && <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"><input placeholder="Client name" value={clientForm.name} onChange={event => setClientForm({ ...clientForm, name: event.target.value })} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><input placeholder="Address line 1" value={clientForm.addressLine1} onChange={event => setClientForm({ ...clientForm, addressLine1: event.target.value })} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><input placeholder="City, State ZIP" value={clientForm.addressLine2} onChange={event => setClientForm({ ...clientForm, addressLine2: event.target.value })} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><input placeholder="Phone" value={clientForm.phone} onChange={event => setClientForm({ ...clientForm, phone: event.target.value })} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><input type="email" placeholder="Email" value={clientForm.email} onChange={event => setClientForm({ ...clientForm, email: event.target.value })} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => void saveClient()} disabled={savingClient || !clientForm.name.trim() || !clientForm.addressLine1.trim()} className="rounded-md bg-[#4b98cf] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{savingClient ? 'Saving client...' : 'Save client'}</button></div>}
          <label className="block text-xs font-bold text-slate-600">Allowed radius in meters<input name="allowedRadiusMeters" value={allowedRadius} onChange={event => setAllowedRadius(event.target.value)} min="25" max="5000" type="number" required className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          <FreeMapPicker onLocationSelect={data => { setSelected(data); if (data.locationName) setLocationName(data.locationName) }} />
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <div className="flex gap-2"><button disabled={saving || !selected || !selectedClientId} className="flex-1 rounded-md bg-[#12263f] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : editingLocationId ? 'Update location' : 'Save location'}</button>{editingLocationId && <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Cancel</button>}</div>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-heading"><div><span className="section-kicker">Saved sites</span><h3>Work locations</h3></div><span className="text-sm text-slate-400">{locations.length} total</span></div>
        <div className="divide-y divide-slate-100">
          {locations.map(location => <div key={location.id} className="flex items-start justify-between gap-3 p-5"><div><p className="font-bold text-[#12263f]">{location.location_name}</p><p className="mt-1 text-sm text-slate-500">{location.address}</p><p className="mt-2 text-xs text-slate-400">{location.client_name} · {location.allowed_radius_meters}m radius</p></div><button type="button" onClick={() => editLocation(location)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button></div>)}
          {locations.length === 0 && <p className="p-6 text-sm text-slate-500">No locations saved yet.</p>}
        </div>
      </section>
    </div>

    <section className="panel overflow-hidden">
      <div className="panel-heading"><div><span className="section-kicker">Assignments</span><h3>Guard locations</h3></div><span className="text-sm text-slate-400">GPS check-in enabled</span></div>
      <div className="divide-y divide-slate-100">
        {employees.map(employee => <div key={employee.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-bold text-[#12263f]">{employee.full_name}</p><p className="text-xs text-slate-500">{employee.employee_id || employee.id}</p></div><select value={employee.assigned_location_id ?? ''} disabled={assigning === employee.id} onChange={event => void assignLocation(employee.id, event.target.value)} className="min-w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">No location assigned</option>{locations.map(location => <option key={location.id} value={location.id}>{location.location_name}</option>)}</select></div>)}
        {employees.length === 0 && <p className="p-6 text-sm text-slate-500">Create an employee first.</p>}
      </div>
    </section>
  </div>
}
