import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  return { supabase, user }
}

export async function GET() {
  const auth = await getUserClient()
  if ('response' in auth) return auth.response
  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.user.id).single()
  const isAdmin = (profile as { role?: string } | null)?.role === 'admin'
  let query = auth.supabase.from('attendance').select('*').order('check_in', { ascending: false }).limit(100)
  if (!isAdmin) query = query.eq('employee_id', auth.user.id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attendance: data ?? [] })
}

export async function POST() {
  const auth = await getUserClient()
  if ('response' in auth) return auth.response
  const { data, error } = await auth.supabase.from('attendance').insert({ employee_id: auth.user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ attendance: data })
}

export async function PATCH(request: Request) {
  const auth = await getUserClient()
  if ('response' in auth) return auth.response
  const body = await request.json()
  const attendanceId = String(body.id ?? '')
  if (!attendanceId) return NextResponse.json({ error: 'Attendance record is required.' }, { status: 400 })
  const { data, error } = await auth.supabase.from('attendance').update({ check_out: new Date().toISOString() }).eq('id', attendanceId).eq('employee_id', auth.user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ attendance: data })
}
