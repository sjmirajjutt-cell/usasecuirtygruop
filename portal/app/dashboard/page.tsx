import { DashboardOverview } from '@/components/dashboard-overview'
import { PageHeader } from '@/components/portal-shell'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, WorkLocation, WorksheetWithRelations } from '@/lib/supabase/database.types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const [{ data: worksheets }, { count: officers }, { data: invoices }, { data: locations }] = await Promise.all([
    supabase.from('worksheets').select('*, officer:profiles(full_name), location:work_locations(location_name, client_name)').order('date', { ascending: false }).limit(500),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'officer'),
    supabase.from('invoices').select('amount_due, status, client_name').order('created_at', { ascending: false }).limit(5),
    supabase.from('work_locations').select('id, location_name, client_name').order('location_name').limit(5)
  ])

  const typedWorksheets = (worksheets ?? []) as WorksheetWithRelations[]
  const typedInvoices = (invoices ?? []) as Pick<Invoice, 'status' | 'amount_due' | 'client_name'>[]
  const typedLocations = (locations ?? []) as Pick<WorkLocation, 'id' | 'location_name' | 'client_name'>[]

  return (
    <>
      <PageHeader eyebrow="Dashboard" title="Good morning, Vince" description="A clear view of guard coverage, hours, payouts, and outstanding client invoices." />
      <DashboardOverview
        initialWorksheets={typedWorksheets}
        initialOfficers={officers ?? 0}
        initialInvoices={typedInvoices}
        initialLocations={typedLocations}
      />
    </>
  )
}
