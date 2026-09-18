import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: worksheets }, { count: officers }, { data: invoices }, { data: locations }] = await Promise.all([
    supabase.from('worksheets').select('*, officer:profiles(full_name), location:work_locations(location_name, client_name)').order('date', { ascending: false }).limit(500),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'officer'),
    supabase.from('invoices').select('amount_due, status, client_name').order('created_at', { ascending: false }).limit(5),
    supabase.from('work_locations').select('id, location_name, client_name').order('location_name').limit(5)
  ])

  return NextResponse.json({
    worksheets: worksheets ?? [],
    officers: officers ?? 0,
    invoices: invoices ?? [],
    locations: locations ?? []
  })
}
