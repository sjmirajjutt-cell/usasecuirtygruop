'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/supabase/database.types'

type LineItem = { hours: string; description: string; rate: string }
type Props = { initialClients: Client[] }

const emptyItem = (): LineItem => ({ hours: '', description: '', rate: '' })
const money = (value: number) => `$${value.toFixed(2)}`

export function InvoiceBuilder({ initialClients }: Props) {
  const router = useRouter()
  const [clients, setClients] = useState(initialClients)
  const [selectedId, setSelectedId] = useState('')
  const [client, setClient] = useState({ name: '', addressLine1: '', addressLine2: '', phone: '', email: '' })
  const [message, setMessage] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('100')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [dueDate, setDueDate] = useState('')
  const [serviceDates, setServiceDates] = useState('')
  const [salesTax, setSalesTax] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setClients(initialClients)
  }, [initialClients])

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.hours) || 0) * (Number(item.rate) || 0), 0)
    const tax = Number(salesTax) || 0
    return { subtotal, tax, total: subtotal + tax }
  }, [items, salesTax])

  function selectClient(id: string) {
    setSelectedId(id)
    const selected = clients.find(item => item.id === id)
    if (!selected) return
    setClient({ name: selected.name, addressLine1: selected.address_line_1, addressLine2: selected.address_line_2 ?? '', phone: selected.phone ?? '', email: selected.email ?? '' })
  }

  function updateItem(index: number, key: keyof LineItem, value: string) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  async function saveInvoice() {
    setError('')
    setMessage('')
    if (!selectedId) {
      setError('Choose a saved client before saving this invoice.')
      return
    }
    if (items.some(item => !item.description.trim() || item.hours === '' || item.rate === '')) {
      setError('Complete the hours, description, and rate for each invoice line.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedId,
          invoiceNumber,
          paymentTerms,
          dueDate,
          serviceDates,
          salesTax,
          items: items.map(item => ({ hours: Number(item.hours), description: item.description, rate: Number(item.rate) }))
        })
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Invoice could not be saved.')
        return
      }
      setMessage(`Invoice ${result.invoice.invoice_number} saved and added to invoice history.`)
      router.refresh()
    } catch {
      setError('Invoice could not be saved. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] no-print sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="section-kicker">Step 3</span>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-[#12263f]">Create invoice</h3>
            <p className="mt-1 text-sm text-slate-500">Choose a client and build the invoice in a few simple steps.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button disabled={saving} className="rounded-xl bg-[#12263f] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#12263f]/15 transition hover:bg-[#0f1c2d] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void saveInvoice()}>{saving ? 'Saving…' : 'Save invoice'}</button>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300" onClick={() => window.print()}>Print / PDF</button>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 no-print">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 no-print">{message}</p>}

      <div className="grid gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] no-print sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Invoice number
          <input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Payment terms
          <input value={paymentTerms} onChange={event => setPaymentTerms(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Due date
          <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Saved client
          <select value={selectedId} onChange={event => selectClient(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10">
            <option value="">Choose a client</option>
            {clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>

      <article className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] print-sheet sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Logo" className="h-14 w-14 rounded-2xl border border-slate-200 bg-slate-50 p-2 object-contain" />
            <div>
              <strong className="block text-base font-bold text-slate-900">USA SECURITY & PROTECTION GROUP LLC</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">2754 W Oakland Park Blvd<br />Fort Lauderdale, FL 33311</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-500">Date</span><span>{new Date().toLocaleDateString('en-US')}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-500">Invoice #</span><span>{invoiceNumber || '—'}</span></div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Invoice to</p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p className="text-base font-bold text-slate-900">{client.name || 'Select a saved client'}</p>
              <p>{client.addressLine1}</p>
              <p>{client.addressLine2}</p>
              <p>{client.phone}</p>
              <p>{client.email}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-600"><span className="font-semibold">Payment terms</span><span>{paymentTerms || '—'}</span></div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600"><span className="font-semibold">Due date</span><span>{dueDate || '—'}</span></div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 no-print">
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Service dates
            <input placeholder="10/3/21 - 10/9/21" value={serviceDates} onChange={event => setServiceDates(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10" />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-3 py-3">Hours</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Rate</th>
                <th className="px-3 py-3">Line total</th>
                <th className="px-3 py-3 no-print"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-3"><input type="number" min="0" step="any" value={item.hours} onChange={event => updateItem(index, 'hours', event.target.value)} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10" /></td>
                  <td className="px-3 py-3"><input value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} placeholder="Security services" className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10" /></td>
                  <td className="px-3 py-3"><input type="number" min="0" step="any" value={item.rate} onChange={event => updateItem(index, 'rate', event.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10" /></td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{money((Number(item.hours) || 0) * (Number(item.rate) || 0))}</td>
                  <td className="px-3 py-3 no-print"><button className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 no-print">
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300" onClick={() => setItems(current => [...current, emptyItem()])}>+ Add line item</button>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm text-slate-600"><span>Sales tax</span><input type="number" min="0" step="any" value={salesTax} onChange={event => setSalesTax(event.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-[#4b98cf] focus:ring-4 focus:ring-[#4b98cf]/10" /></div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900"><span>Total</span><span>{money(totals.total)}</span></div>
          </div>
        </div>
      </article>
    </section>
  )
}
