import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  return { user }
}

export async function GET() {
  const auth = await getAdmin()
  if ('response' in auth) return auth.response
  const supabase = await createClient()
  const { data, error } = await supabase.from('work_locations').select('*').order('location_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ locations: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await getAdmin()
  if ('response' in auth) return auth.response
  const body = await request.json()
  const locationName = String(body.locationName ?? '').trim()
  const address = String(body.address ?? '').trim()
  const clientName = String(body.clientName ?? '').trim()
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  const allowedRadiusMeters = Number(body.allowedRadiusMeters ?? 150)

  if (!locationName || !address || !clientName || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(allowedRadiusMeters)) {
    return NextResponse.json({ error: 'Location name, address, client, map point, and radius are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('work_locations').insert({
    location_name: locationName,
    address,
    client_name: clientName,
    latitude,
    longitude,
    allowed_radius_meters: allowedRadiusMeters
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ location: data })
}

export async function PATCH(request: Request) {
  const auth = await getAdmin()
  if ('response' in auth) return auth.response
  const body = await request.json()
  const employeeId = String(body.employeeId ?? '')
  const locationId = body.locationId ? String(body.locationId) : null
  if (!employeeId) return NextResponse.json({ error: 'Employee is required.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ assigned_location_id: locationId }).eq('id', employeeId).eq('role', 'officer')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, employeeId, locationId })
}
