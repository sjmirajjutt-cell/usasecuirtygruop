import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type InvoiceLine = { hours: number; description: string; rate: number }

function isInvoiceLine(value: unknown): value is InvoiceLine {
  if (!value || typeof value !== 'object') return false
  const line = value as Record<string, unknown>
  return Number.isFinite(Number(line.hours))
    && Number(line.hours) >= 0
    && Number.isFinite(Number(line.rate))
    && Number(line.rate) >= 0
    && typeof line.description === 'string'
    && Boolean(line.description.trim())
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const clientId = String(body.clientId ?? '')
  const invoiceNumber = String(body.invoiceNumber ?? '').trim()
  const dueDate = body.dueDate ? String(body.dueDate) : null
  const paymentTerms = String(body.paymentTerms ?? '').trim()
  const serviceDates = String(body.serviceDates ?? '').trim()
  const salesTax = Number(body.salesTax ?? 0)
  const lines: unknown[] = Array.isArray(body.items) ? body.items : []
  if (!clientId || !invoiceNumber || !lines.length || !Number.isFinite(salesTax) || salesTax < 0) {
    return NextResponse.json({ error: 'Choose a client, invoice number, line item, and valid tax amount.' }, { status: 400 })
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return NextResponse.json({ error: 'Enter a valid due date.' }, { status: 400 })
  if (!lines.every(isInvoiceLine)) {
    return NextResponse.json({ error: 'Each invoice line needs a description and valid non-negative hours and rate.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: client, error: clientError } = await admin.from('clients').select('name').eq('id', clientId).single()
  if (clientError || !client) return NextResponse.json({ error: 'The selected client was not found.' }, { status: 404 })

  const normalizedItems = lines.map(item => ({ hours: Number(item.hours), description: item.description.trim(), rate: Number(item.rate) }))
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.hours * item.rate, 0)
  const { data, error } = await admin.from('invoices').insert({
    client_id: clientId,
    client_name: client.name,
    invoice_number: invoiceNumber,
    due_date: dueDate,
    payment_terms: paymentTerms || null,
    service_dates: serviceDates || null,
    line_items: normalizedItems,
    sales_tax: salesTax,
    amount_due: subtotal + salesTax,
    status: 'pending'
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ invoice: data }, { status: 201 })
}
