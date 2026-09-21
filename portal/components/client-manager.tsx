'use client'

import { useState } from 'react'
import type { Client } from '@/lib/supabase/database.types'

type ClientForm = { name: string; addressLine1: string; addressLine2: string; phone: string; email: string }
const emptyForm: ClientForm = { name: '', addressLine1: '', addressLine2: '', phone: '', email: '' }

export function ClientManager({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients)
  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function updateField(key: keyof ClientForm, value: string) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function startEdit(client: Client) {
    setEditingId(client.id)
    setForm({ name: client.name, addressLine1: client.address_line_1, addressLine2: client.address_line_2 ?? '', phone: client.phone ?? '', email: client.email ?? '' })
    setMessage('')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  async function saveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setMessage(''); setError('')
    try {
      const response = await fetch('/api/clients', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editingId }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error ?? `Client could not be saved (${response.status}).`)
        return
      }
      setClients(current => [...current.filter(client => client.id !== result.client.id), result.client].sort((a, b) => a.name.localeCompare(b.name)))
      setMessage(editingId ? 'Client updated.' : 'Client added.')
      setEditingId(null)
      setForm(emptyForm)
    } catch {
      setError('Client could not be saved. Check your login and internet connection.')
    } finally {
      setSaving(false)
    }
  }

  async function removeClient(client: Client) {
    if (!window.confirm(`Remove ${client.name}?`)) return
    setRemovingId(client.id); setMessage(''); setError('')
    try {
      const response = await fetch(`/api/clients?id=${encodeURIComponent(client.id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setError(result.error ?? `Client could not be removed (${response.status}).`)
      else { setClients(current => current.filter(item => item.id !== client.id)); setMessage('Client removed.'); if (editingId === client.id) cancelEdit() }
    } catch {
      setError('Client could not be removed. Check your login and internet connection.')
    } finally {
      setRemovingId(null)
    }
  }

  return <section className="panel p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="section-kicker">Client management</span><h3 className="mt-2 text-lg font-bold text-[#12263f]">Add and manage clients</h3><p className="mt-1 text-sm text-slate-500">Create client records here, then select them when building an invoice.</p></div><span className="text-sm text-slate-400">{clients.length} clients</span></div>
    <form onSubmit={saveClient} className="mt-5 grid gap-3 sm:grid-cols-2"><input required placeholder="Client name" value={form.name} onChange={event => updateField('name', event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><input required placeholder="Address line 1" value={form.addressLine1} onChange={event => updateField('addressLine1', event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><input placeholder="City, State ZIP" value={form.addressLine2} onChange={event => updateField('addressLine2', event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><input placeholder="Phone" value={form.phone} onChange={event => updateField('phone', event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><input type="email" placeholder="Email" value={form.email} onChange={event => updateField('email', event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" /><div className="flex gap-2"><button disabled={saving} className="rounded-md bg-[#12263f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update client' : 'Add client'}</button>{editingId && <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>}</div></form>
    {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100">{clients.map(client => <div key={client.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold text-[#12263f]">{client.name}</p><p className="text-sm text-slate-500">{client.address_line_1}{client.address_line_2 ? `, ${client.address_line_2}` : ''}</p><p className="text-xs text-slate-400">{client.phone || 'No phone'} · {client.email || 'No email'}</p></div><div className="flex gap-2"><button type="button" onClick={() => startEdit(client)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Edit</button><button type="button" onClick={() => void removeClient(client)} disabled={removingId === client.id} className="rounded-md border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">{removingId === client.id ? 'Removing...' : 'Remove'}</button></div></div>)}{clients.length === 0 && <p className="py-6 text-sm text-slate-500">No clients added yet.</p>}</div>
  </section>
}
