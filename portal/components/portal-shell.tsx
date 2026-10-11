'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const mainNavigation = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/dashboard/employees', label: '1. Add employee', icon: 'person_add' },
  { href: '/dashboard/attendance', label: '2. Attendance', icon: 'event_available' },
  { href: '/dashboard/payroll', label: '3. Payroll', icon: 'payments' },
  { href: '/dashboard/invoices', label: 'Clients & invoices', icon: 'receipt' }
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function signOut() {
    setIsSigningOut(true)
    setSignOutError('')
    try {
      const { error } = await createClient().auth.signOut()
      if (error) {
        setSignOutError('Could not sign out. Please try again.')
        setIsSigningOut(false)
        return
      }
      router.replace('/login')
      router.refresh()
    } catch {
      setSignOutError('Could not sign out. Check your connection and try again.')
      setIsSigningOut(false)
    }
  }

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className="min-h-screen bg-[#f6f8fa] lg:flex">
      <button
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="portal-sidebar"
        className="mobile-sidebar-toggle lg:hidden"
        onClick={() => setIsOpen(value => !value)}
      >
        <span className="material-icons">{isOpen ? 'close' : 'menu'}</span>
        <span>{isOpen ? 'Close' : 'Menu'}</span>
      </button>

      <button
        type="button"
        aria-label="Close navigation menu"
        className={`mobile-sidebar-overlay ${isOpen ? 'is-visible' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <aside id="portal-sidebar" className={`no-print sidebar px-5 py-6 text-white ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Group" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8ed4c8]">USSPG</p>
            <h1 className="mt-1 text-sm font-bold leading-tight">USA Security</h1>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="sidebar-close ml-auto lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <p className="sidebar-label">Main menu</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {mainNavigation.map(item => {
            const active = item.href === '/dashboard'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
              >
                <span className="material-icons">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <p className="sidebar-label">Account</p>
        <button type="button" onClick={() => void signOut()} disabled={isSigningOut} className="sidebar-link w-full justify-start whitespace-nowrap text-left disabled:cursor-wait disabled:opacity-60">
          <span className="material-icons shrink-0">logout</span>
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
        {signOutError && <p role="alert" className="px-3 pt-2 text-xs leading-5 text-red-200">{signOutError}</p>}

        <div className="sidebar-user mt-auto">
          <div className="avatar">VC</div>
          <div>
            <p className="text-sm font-semibold">Vince Charles</p>
            <p className="text-xs text-white/50">Admin</p>
          </div>
          <span className="material-icons ml-auto text-white/40">more_horiz</span>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[#f6f8fa]">{children}</main>
    </div>
  )
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="page-header">
      <div>
        <div className="breadcrumb"><span>Home</span><span>/</span><strong>{eyebrow}</strong></div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  )
}
