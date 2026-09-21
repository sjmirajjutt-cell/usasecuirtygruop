'use client'

import { useMemo, useState } from 'react'

type InvoiceRecord = { id: string; client_name: string; amount_due: number; status: string; created_at: string; invoice_number?: string | null; due_date?: string | null; payment_terms?: string | null }

type InvoiceFilters = { search: string; status: string; from: string; to: string }
const emptyFilters: InvoiceFilters = { search: '', status: '', from: '', to: '' }

export function InvoiceHistory({ initialInvoices }: { initialInvoices: InvoiceRecord[] }) {
  const [filters, setFilters] = useState<InvoiceFilters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(true)

  const filteredInvoices = useMemo(() => initialInvoices.filter(invoice => {
    const date = invoice.created_at.slice(0, 10)
    const matchesSearch = !filters.search || `${invoice.client_name} ${invoice.invoice_number ?? ''}`.toLowerCase().includes(filters.search.toLowerCase())
    return matchesSearch && (!filters.status || invoice.status === filters.status) && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
  }), [initialInvoices, filters])

  const grandTotal = filteredInvoices.reduce((total, invoice) => total + Number(invoice.amount_due || 0), 0)
  const pendingTotal = filteredInvoices.filter(invoice => invoice.status === 'pending').reduce((total, invoice) => total + Number(invoice.amount_due || 0), 0)
  const paidTotal = filteredInvoices.filter(invoice => invoice.status === 'paid').reduce((total, invoice) => total + Number(invoice.amount_due || 0), 0)

  function setFilter(key: keyof InvoiceFilters, value: string) {
    setFilters(current => ({ ...current, [key]: value }))
  }

  return <section className="invoice-history panel mt-6 overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Finance</span><h3>Invoice history</h3></div><div className="no-print flex flex-wrap gap-2"><button type="button" onClick={() => setShowFilters(value => !value)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">{showFilters ? 'Hide filters' : 'Show filters'}</button><button type="button" onClick={() => window.print()} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Print</button></div></div>
    {showFilters && <div className="no-print grid gap-3 border-b border-slate-100 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4"><input value={filters.search} onChange={event => setFilter('search', event.target.value)} placeholder="Search client or invoice number" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" /><select value={filters.status} onChange={event => setFilter('status', event.target.value)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select><label className="text-xs font-bold text-slate-500">From<input type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-slate-500">To<input type="date" value={filters.to} onChange={event => setFilter('to', event.target.value)} className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label><button type="button" onClick={() => setFilters(emptyFilters)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">Clear filters</button></div>}
    <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3"><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Filtered invoices</span><strong className="mt-1 block text-xl text-[#12263f]">{filteredInvoices.length}</strong></div><div className="rounded-md bg-amber-50 p-4"><span className="text-xs text-slate-500">Pending total</span><strong className="mt-1 block text-xl text-amber-700">${pendingTotal.toFixed(2)}</strong></div><div className="rounded-md bg-emerald-50 p-4"><span className="text-xs text-slate-500">Grand total</span><strong className="mt-1 block text-xl text-emerald-700">${grandTotal.toFixed(2)}</strong><small className="text-slate-500">Paid: ${paidTotal.toFixed(2)}</small></div></div>
    <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Invoice</th><th className="px-6 py-3">Client</th><th className="px-6 py-3">Created</th><th className="px-6 py-3">Due date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredInvoices.map(invoice => <tr key={invoice.id}><td className="px-6 py-4 font-semibold">{invoice.invoice_number || invoice.id.slice(0, 8)}</td><td className="px-6 py-4">{invoice.client_name}</td><td className="px-6 py-4">{new Date(invoice.created_at).toLocaleDateString('en-US')}</td><td className="px-6 py-4">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US') : '—'}</td><td className="px-6 py-4"><span className={invoice.status === 'paid' ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>{invoice.status}</span></td><td className="px-6 py-4 font-semibold">${Number(invoice.amount_due || 0).toFixed(2)}</td></tr>)}</tbody></table>{filteredInvoices.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No invoices match these filters.</p>}</div>
  </section>
}
