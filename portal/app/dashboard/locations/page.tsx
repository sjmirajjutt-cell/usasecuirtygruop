import { PageHeader } from '@/components/portal-shell'
import { LocationManager } from '@/components/location-manager'
import { createClient } from '@/lib/supabase/server'
import type { Client, Profile, WorkLocation } from '@/lib/supabase/database.types'

export default async function LocationsPage() {
  const supabase = await createClient()
  const [{ data: employees }, { data: locations }, { data: clients }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, pin_code, employee_id, phone, address, hourly_rate, is_active, assigned_location_id, created_at').eq('role', 'officer').order('full_name'),
    supabase.from('work_locations').select('*').order('location_name'),
    supabase.from('clients').select('*').order('name')
  ])

  return <><PageHeader eyebrow="Operations" title="Locations" description="Create map-based work sites, connect them to clients, and assign guards." /><section className="dashboard-content"><LocationManager initialEmployees={(employees ?? []) as Profile[]} initialLocations={(locations ?? []) as WorkLocation[]} initialClients={(clients ?? []) as Client[]} /></section></>
}