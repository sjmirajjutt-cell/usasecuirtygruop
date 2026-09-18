import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { monthBounds, summarizeWorksheets } from '@/lib/worksheets'
import type { WorksheetWithRelations } from '@/lib/supabase/database.types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const month = new URL(request.url).searchParams.get('month')
  let query = supabase.from('worksheets').select('*, officer:profiles(full_name), location:work_locations(location_name, client_name)').order('date', { ascending: false })
  if (month) { const bounds = monthBounds(month); query = query.gte('date', bounds.start).lte('date', bounds.end) }
  const { data, error } = await query.limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as unknown as WorksheetWithRelations[]
  return NextResponse.json({ rows, summary: summarizeWorksheets(rows) })
}
