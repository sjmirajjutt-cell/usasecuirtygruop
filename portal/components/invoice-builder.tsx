'use client'

import { useMemo, useState } from 'react'
import type { Client } from '@/lib/supabase/database.types'

type LineItem = { hours: string; description: string; rate: string }
type Props = { initialClients: Client[] }

const emptyItem = (): LineItem => ({ hours: '', description: '', rate: '' })
const money = (value: number) => `$${value.toFixed(2)}`

export function InvoiceBuilder({ initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [selectedId, setSelectedId] = useState('')
  const [client, setClient] = useState({ name: '', addressLine1: '', addressLine2: '', phone: '', email: '' })
  const [showClientForm, setShowClientForm] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [message, setMessage] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('100')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [dueDate, setDueDate] = useState('')
  const [serviceDates, setServiceDates] = useState('')
  const [salesTax, setSalesTax] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyItem()])

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

  async function saveClient(event: React.FormEvent) {
    event.preventDefault()
    setSavingClient(true)
    setMessage('')
    try {
      const response = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(client) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) setMessage(result.error ?? `Unable to save client (${response.status})`)
      else { setClients(current => [...current, result.client].sort((a, b) => a.name.localeCompare(b.name))); setSelectedId(result.client.id); setShowClientForm(false); setMessage('Client saved. It is ready for future invoices.') }
    } catch {
      setMessage('Client could not be saved. Check your login and internet connection.')
    } finally {
      setSavingClient(false)
    }
  }

  function updateItem(index: number, key: keyof LineItem, value: string) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  return <section className="invoice-workspace">
    <div className="invoice-toolbar no-print"><div><span className="section-kicker">Finance</span><h3>Create invoice</h3><p>Select a saved client and their details will be reused automatically.</p></div><button className="invoice-primary" onClick={() => window.print()}>Download / Print PDF</button></div>
    <div className="invoice-controls no-print"><label>Invoice number<input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} /></label><label>Payment terms<input value={paymentTerms} onChange={event => setPaymentTerms(event.target.value)} /></label><label>Due date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></label></div>
    <div className="client-picker no-print"><div><label className="field-label">Saved client</label><select value={selectedId} onChange={event => selectClient(event.target.value)}><option value="">Choose a client</option>{clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><button className="invoice-secondary" onClick={() => setShowClientForm(value => !value)}>{showClientForm ? 'Close client form' : 'Add new client'}</button></div>
    {showClientForm && <form className="client-form no-print" onSubmit={saveClient}><input required placeholder="Client name" value={client.name} onChange={event => setClient({ ...client, name: event.target.value })} /><input required placeholder="Address line 1" value={client.addressLine1} onChange={event => setClient({ ...client, addressLine1: event.target.value })} /><input placeholder="City, State ZIP" value={client.addressLine2} onChange={event => setClient({ ...client, addressLine2: event.target.value })} /><input placeholder="Phone" value={client.phone} onChange={event => setClient({ ...client, phone: event.target.value })} /><input type="email" placeholder="Email" value={client.email} onChange={event => setClient({ ...client, email: event.target.value })} /><button className="invoice-primary" disabled={savingClient}>{savingClient ? 'Saving...' : 'Save client'}</button></form>}
    {message && <p className="invoice-message no-print">{message}</p>}

    <article className="invoice-sheet print-sheet"><div className="invoice-company"><img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Logo" /><div><strong>USA SECURITY & PROTECTION GROUP LLC</strong><span>2754 W Oakland Park Blvd<br />Fort Lauderdale, FL 33311</span><span>usacurityprogroupllc@gmail.com</span><span>954-477-1088</span></div><div className="invoice-meta"><span>Date: {new Date().toLocaleDateString('en-US')}</span><span>INVOICE # {invoiceNumber || '—'}</span></div></div><div className="invoice-client"><div><strong>INVOICE TO</strong><b>{client.name || 'Select a saved client'}</b><span>{client.addressLine1}</span><span>{client.addressLine2}</span><span>{client.phone}</span><span>{client.email}</span></div><div className="invoice-term"><b>Payment Terms</b><span>{paymentTerms || '—'}</span><b>Due Date</b><span>{dueDate || '—'}</span></div></div><div className="service-date"><b>Service Dates</b><span>{serviceDates || 'Enter service dates above or here'}</span><input className="no-print" placeholder="10/3/21 - 10/9/21" value={serviceDates} onChange={event => setServiceDates(event.target.value)} /></div><table className="invoice-lines"><thead><tr><th>Hours</th><th>Description</th><th>Rate</th><th>Line Total</th><th className="no-print"> </th></tr></thead><tbody>{items.map((item, index) => <tr key={index}><td><input type="number" min="0" step="any" value={item.hours} onChange={event => updateItem(index, 'hours', event.target.value)} /></td><td><input value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} placeholder="Security services" /></td><td><input type="number" min="0" step="any" value={item.rate} onChange={event => updateItem(index, 'rate', event.target.value)} /></td><td>{money((Number(item.hours) || 0) * (Number(item.rate) || 0))}</td><td className="no-print"><button className="remove-line" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></td></tr>)}</tbody></table><button className="invoice-secondary no-print" onClick={() => setItems(current => [...current, emptyItem()])}>+ Add line item</button><div className="invoice-totals"><div><span>Subtotal</span><b>{money(totals.subtotal)}</b><label>Sales tax <input type="number" min="0" step="any" value={salesTax} onChange={event => setSalesTax(event.target.value)} /></label><strong>Total <em>{money(totals.total)}</em></strong></div></div></article>
  </section>
}
