import { PageHeader } from '@/components/portal-shell'
import { InvoiceBuilder } from '@/components/invoice-builder'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/supabase/database.types'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('clients').select('*').order('name')
  const clients = (data ?? []) as Client[]
  return <><PageHeader eyebrow="Finance" title="Invoices" description="Build client invoices with saved contact details and reusable line items." /><main className="invoice-page"><InvoiceBuilder initialClients={clients} /></main></>
}
