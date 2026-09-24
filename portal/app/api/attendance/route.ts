import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getUserClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, response: NextResponse.json({ error: 'Please sign in again.' }, { status: 401 }) }
  return { supabase, user }
}

function distanceInMeters(latitude1: number, longitude1: number, latitude2: number, longitude2: number) {
  const earthRadius = 6371000
  const latitudeDelta = (latitude2 - latitude1) * Math.PI / 180
  const longitudeDelta = (longitude2 - longitude1) * Math.PI / 180
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
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

export async function POST(request: Request) {
  const auth = await getUserClient()
  if ('response' in auth) return auth.response
  const body = await request.json().catch(() => ({}))
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const accuracy = Number(body.accuracy)
  const { data: profile } = await auth.supabase.from('profiles').select('assigned_location_id').eq('id', auth.user.id).single()
  if (!profile?.assigned_location_id) return NextResponse.json({ error: 'An administrator has not assigned you a work location yet.' }, { status: 400 })
  const { data: location } = await auth.supabase.from('work_locations').select('id, latitude, longitude, allowed_radius_meters').eq('id', profile.assigned_location_id).single()
  if (!location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude))) return NextResponse.json({ error: 'The assigned location does not have valid map coordinates.' }, { status: 400 })
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json({ error: 'Browser location permission is required to check in.' }, { status: 400 })

  const distance = distanceInMeters(latitude, longitude, Number(location.latitude), Number(location.longitude))
  const locationStatus = distance <= Number(location.allowed_radius_meters) ? 'matched' : 'outside_radius'
  if (locationStatus === 'outside_radius') return NextResponse.json({ error: `You are ${Math.round(distance)}m from the assigned location. The allowed radius is ${location.allowed_radius_meters}m.` }, { status: 400 })

  const { data, error } = await auth.supabase.from('attendance').insert({ employee_id: auth.user.id, assigned_location_id: location.id, check_in_latitude: latitude, check_in_longitude: longitude, check_in_accuracy_meters: Number.isFinite(accuracy) ? accuracy : null, distance_from_location_meters: distance, location_status: locationStatus }).select().single()
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
