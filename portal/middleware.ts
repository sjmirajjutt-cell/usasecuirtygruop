import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response = NextResponse.next({ request })
          response.cookies.set(name, value, options)
        })
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isEmployee = request.nextUrl.pathname.startsWith('/employee')
  if (!user && (isDashboard || isEmployee)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && (isDashboard || isEmployee)) {
    const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).single()
    if (profile?.is_active === false) return NextResponse.redirect(new URL('/login', request.url))
    if (isDashboard && profile?.role !== 'admin') return NextResponse.redirect(new URL('/employee', request.url))
    if (isEmployee && profile?.role === 'admin') return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return response
}

export const config = { matcher: ['/dashboard/:path*'] }
