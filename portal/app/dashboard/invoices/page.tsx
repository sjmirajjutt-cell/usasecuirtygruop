import { PageHeader } from '@/components/portal-shell'
import { InvoiceBuilder } from '@/components/invoice-builder'
import { InvoiceHistory } from '@/components/invoice-history'
import { ClientManager } from '@/components/client-manager'
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
  return <><PageHeader eyebrow="Clients & invoices" title="Clients and invoices" description="Save client details once, then create, print, and track their invoices here." /><main className="invoice-page"><ClientManager initialClients={clients} /><InvoiceBuilder initialClients={clients} /><InvoiceHistory initialInvoices={(invoices ?? []) as InvoiceRecord[]} /></main></>
}
