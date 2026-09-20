import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { attendanceToWorksheetRows } from '@/lib/worksheets'
import type { Attendance, Profile, WorksheetWithRelations } from '@/lib/supabase/database.types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: worksheets }, { count: officers }, { data: invoices }, { data: locations }, { data: attendance }, { data: employees }] = await Promise.all([
    supabase.from('worksheets').select('*, officer:profiles(full_name), location:work_locations(location_name, client_name)').order('date', { ascending: false }).limit(500),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'officer'),
    supabase.from('invoices').select('amount_due, status, client_name').order('created_at', { ascending: false }).limit(5),
    supabase.from('work_locations').select('id, location_name, client_name').order('location_name').limit(5),
    supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(100),
    supabase.from('profiles').select('id, full_name, hourly_rate').eq('role', 'officer')
  ])

  const attendanceRows = attendanceToWorksheetRows((attendance ?? []) as Attendance[], (employees ?? []) as Pick<Profile, 'id' | 'full_name' | 'hourly_rate'>[])

  return NextResponse.json({
    worksheets: [...((worksheets ?? []) as unknown as WorksheetWithRelations[]), ...attendanceRows],
    officers: officers ?? 0,
    invoices: invoices ?? [],
    locations: locations ?? []
  })
}
