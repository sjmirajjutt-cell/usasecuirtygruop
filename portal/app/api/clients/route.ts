import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  return { user }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('response' in auth) return auth.response
  const body = await request.json()
  const name = String(body.name ?? '').trim()
  const addressLine1 = String(body.addressLine1 ?? '').trim()
  const addressLine2 = String(body.addressLine2 ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const email = String(body.email ?? '').trim()
  if (!name || !addressLine1) return NextResponse.json({ error: 'Client name and address are required.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('clients').insert({
    name,
    address_line_1: addressLine1,
    address_line_2: addressLine2 || null,
    phone: phone || null,
    email: email || null
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ client: data })
}
