import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/lib/supabase/database.types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const adminProfile = profileData as Pick<Profile, 'role'> | null
  if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const fullName = String(body.fullName ?? '').trim()
  const employeeId = String(body.employeeId ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const address = String(body.address ?? '').trim()
  const hourlyRate = Number(body.hourlyRate ?? 0)
  const assignedLocationId = body.assignedLocationId ? String(body.assignedLocationId) : null
  const newLocation = body.newLocation && typeof body.newLocation === 'object' ? body.newLocation : null
  const newLocationName = String(newLocation?.locationName ?? '').trim()
  const newLocationAddress = String(newLocation?.address ?? '').trim()
  const newLocationLatitude = Number(newLocation?.latitude)
  const newLocationLongitude = Number(newLocation?.longitude)

  if (!fullName || !employeeId || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return NextResponse.json({ error: 'Name, employee ID, and a valid hourly rate are required.' }, { status: 400 })
  }

  if (assignedLocationId && newLocation) {
    return NextResponse.json({ error: 'Choose a saved work location or enter a new one, not both.' }, { status: 400 })
  }

  if (newLocation && (
    !newLocationName ||
    !newLocationAddress ||
    !Number.isFinite(newLocationLatitude) ||
    Math.abs(newLocationLatitude) > 90 ||
    !Number.isFinite(newLocationLongitude) ||
    Math.abs(newLocationLongitude) > 180
  )) {
    return NextResponse.json({ error: 'A location name and verified map point are required for a new work location.' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (assignedLocationId) {
    const { data: location, error: locationError } = await admin
      .from('work_locations')
      .select('id')
      .eq('id', assignedLocationId)
      .maybeSingle()
    if (locationError || !location) {
      return NextResponse.json({ error: locationError?.message ?? 'The selected work location was not found.' }, { status: 400 })
    }
  }

  let resolvedLocationId = assignedLocationId
  let createdLocationId: string | null = null

  if (newLocation) {
    const { data: existingLocation, error: lookupError } = await admin
      .from('work_locations')
      .select('id')
      .eq('location_name', newLocationName)
      .eq('address', newLocationAddress)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 400 })
    }

    if (existingLocation) {
      resolvedLocationId = existingLocation.id
    } else {
      const { data: insertedLocation, error: locationInsertError } = await admin
        .from('work_locations')
        .insert({
          location_name: newLocationName,
          address: newLocationAddress,
          client_name: newLocationName,
          latitude: newLocationLatitude,
          longitude: newLocationLongitude,
          allowed_radius_meters: 150
        })
        .select('id')
        .single()

      if (locationInsertError || !insertedLocation) {
        return NextResponse.json({ error: locationInsertError?.message ?? 'Work location could not be saved.' }, { status: 400 })
      }

      resolvedLocationId = insertedLocation.id
      createdLocationId = insertedLocation.id
    }
  }

  const employeeProfileId = randomUUID()
  const { error: profileError } = await admin.from('profiles').insert({
    id: employeeProfileId,
    full_name: fullName,
    role: 'officer',
    employee_id: employeeId,
    phone: phone || null,
    address: address || null,
    hourly_rate: hourlyRate,
    assigned_location_id: resolvedLocationId,
    is_active: true
  })

  if (profileError) {
    let errorMessage = profileError.message
    if (createdLocationId) {
      const { error: locationCleanupError } = await admin.from('work_locations').delete().eq('id', createdLocationId)
      if (locationCleanupError) errorMessage = `${errorMessage} Work location cleanup failed: ${locationCleanupError.message}`
    }
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  return NextResponse.json({ id: employeeProfileId, employeeId, assignedLocationId: resolvedLocationId })
}