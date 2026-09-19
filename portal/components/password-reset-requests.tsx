'use client'

import { useEffect, useState } from 'react'

export type PasswordResetRequestItem = {
  id: string
  employee_id: string
  requested_by_name: string
  email: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
  reviewer_id: string | null
  reviewed_at: string | null
  created_at: string
}

export function PasswordResetRequests() {
  const [items, setItems] = useState<PasswordResetRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/password-reset-requests', { cache: 'no-store' })
    if (!response.ok) {
      setLoading(false)
      return
    }
    const payload = await response.json()
    setItems(payload.requests ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function submitRequest() {
    setError(''); setMessage('')
    const response = await fetch('/api/password-reset-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, email })
    })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error ?? 'Unable to submit reset request.')
      return
    }
    setMessage('Password reset request sent to admin.')
    setReason(''); setEmail('')
    await load()
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected', note: string) {
    const response = await fetch('/api/password-reset-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, note })
    })
    if (response.ok) {
      await load()
    }
  }

  const pendingCount = items.filter(item => item.status === 'pending').length

  return (
    <div id="requests" className="space-y-5">
      <section className="panel p-6">
        <span className="section-kicker">Password reset</span>
        <h3 className="mt-2 text-lg font-bold text-[#12263f]">Request a password reset</h3>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#4b98cf] focus:bg-white" type="email" placeholder="you@company.com" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Reason
            <textarea value={reason} onChange={event => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#4b98cf] focus:bg-white" placeholder="Describe why you need a password reset." />
          </label>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <button onClick={submitRequest} className="rounded-lg bg-[#12263f] px-4 py-2.5 text-sm font-bold text-white">Send request</button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Requests</span>
            <h3>Reset requests</h3>
          </div>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">{pendingCount} pending</span>
        </div>

        <div className="space-y-3 p-5">
          {loading ? <p className="text-sm text-slate-500">Loading requests...</p> : items.length === 0 ? <p className="text-sm text-slate-500">No password reset requests yet.</p> : items.map(item => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#12263f]">{item.requested_by_name}</p>
                  <p className="text-xs text-slate-500">{item.email}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${item.status === 'pending' ? 'bg-amber-100 text-amber-700' : item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.reason || 'No reason provided.'}</p>
              {item.note && <p className="mt-2 text-xs text-slate-500">Admin note: {item.note}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => updateStatus(item.id, 'approved', 'Approved by admin')} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Approve</button>
                <button onClick={() => updateStatus(item.id, 'rejected', 'Rejected by admin')} className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
