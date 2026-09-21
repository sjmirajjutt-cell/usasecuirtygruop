import { PageHeader } from '@/components/portal-shell'
import { ClientManager } from '@/components/client-manager'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/supabase/database.types'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('clients').select('*').order('name')
  return <><PageHeader eyebrow="Operations" title="Client management" description="Add, edit, and remove client records used across locations and invoices." /><section className="dashboard-content"><ClientManager initialClients={(data ?? []) as Client[]} /></section></>
}