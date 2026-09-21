import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const response = await fetch(rawUrl, { redirect: 'follow', cache: 'no-store' })
    return NextResponse.json({ url: response.url || rawUrl })
  } catch (error) {
    return NextResponse.json({ error: 'Could not resolve map link' }, { status: 400 })
  }
}
