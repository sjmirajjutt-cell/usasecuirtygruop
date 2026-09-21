import { PageHeader } from '@/components/portal-shell'
import { InvoiceBuilder } from '@/components/invoice-builder'
import { InvoiceHistory } from '@/components/invoice-history'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/supabase/database.types'

type InvoiceRecord = { id: string; client_name: string; amount_due: number; status: string; created_at: string; invoice_number?: string | null; due_date?: string | null; payment_terms?: string | null }

export default async function InvoicesPage() {
  const supabase = await createClient()
  const [{ data }, { data: invoices }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('invoices').select('*').order('created_at', { ascending: false })
  ])
  const clients = (data ?? []) as Client[]
  return <><PageHeader eyebrow="Finance" title="Invoices" description="Build client invoices and review invoice history with totals." /><main className="invoice-page"><InvoiceBuilder initialClients={clients} /><InvoiceHistory initialInvoices={(invoices ?? []) as InvoiceRecord[]} /></main></>
}
