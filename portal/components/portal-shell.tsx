'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PasswordResetRequestSummary = {
  id: string
  employee_id: string
  requested_by_name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reason: string | null
}

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: 'schedule' },
  { href: '/dashboard/payroll', label: 'Payroll', icon: 'payments' },
  { href: '/dashboard/worksheets', label: 'Worksheets', icon: 'assignment' },
  { href: '/dashboard/invoices', label: 'Invoices', icon: 'receipt' },
  { href: '/dashboard/clients', label: 'Clients', icon: 'business' },
  { href: '/dashboard/locations', label: 'Locations', icon: 'location_on' },
  { href: '/dashboard/employees', label: 'Employees', icon: 'people' }
]

const PendingRequestsContext = createContext<PasswordResetRequestSummary[]>([])

function AdminNotifications() {
  const items = useContext(PendingRequestsContext)
  const [open, setOpen] = useState(false)

  const unreadCount = items.length

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Review password reset requests"
        className="icon-button relative"
        onClick={() => setOpen(value => !value)}
      >
        <span className="material-icons">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d4434f] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-3 w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10">
          <div className="mb-2 flex items-center justify-between px-2 pt-1">
            <p className="text-sm font-bold text-[#12263f]">Reset requests</p>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
              {unreadCount} new
            </span>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                No pending reset requests.
              </div>
            ) : (
              items.slice(0, 5).map(item => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#12263f]">{item.requested_by_name}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      pending
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.email}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{item.reason || 'Password reset requested.'}</p>
                </div>
              ))
            )}
          </div>

          <Link href="/dashboard/settings#requests" className="mt-3 block rounded-xl bg-[#12263f] px-3 py-2 text-center text-xs font-bold text-white" onClick={() => setOpen(false)}>
            View all requests
          </Link>
        </div>
      )}
    </div>
  )
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PasswordResetRequestSummary[]>([])

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/password-reset-requests', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        const pending = (payload.requests ?? []).filter((item: PasswordResetRequestSummary) => item.status === 'pending')
        setPendingRequests(pending)
      } catch {
        // ignore header fetch failures
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 30000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <PendingRequestsContext.Provider value={pendingRequests}>
      <div className="min-h-screen bg-[#f6f8fa] lg:flex">
      <button
        type="button"
        aria-label="Toggle sidebar"
        className="mobile-sidebar-toggle lg:hidden"
        onClick={() => setIsOpen(value => !value)}
      >
        <span className="material-icons">menu</span>
      </button>

      <div
        className={`mobile-sidebar-overlay ${isOpen ? 'is-visible' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`no-print sidebar px-5 py-6 text-white ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Group" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8ed4c8]">USSPG</p>
            <h1 className="mt-1 text-sm font-bold leading-tight">USA Security & Protection Group</h1>
          </div>
        </div>

        <p className="sidebar-label">Workspace</p>
        <nav className="space-y-1">
          {navigation.map(item => {
            const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}>
                <span className="material-icons">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <p className="sidebar-label mt-8">Requests</p>
        <Link href="/dashboard/settings#requests" className={`sidebar-link ${pathname.startsWith('/dashboard/settings') ? 'sidebar-link-active' : ''}`}>
          <span className="material-icons">notifications_active</span>
          Password resets
          {pendingRequests.length > 0 && (
            <span className="ml-auto rounded-full bg-[#d4434f] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {pendingRequests.length > 9 ? '9+' : pendingRequests.length}
            </span>
          )}
        </Link>

        <p className="sidebar-label mt-8">Account</p>
        <Link href="/dashboard/settings" className={`sidebar-link ${pathname.startsWith('/dashboard/settings') ? 'sidebar-link-active' : ''}`}>
          <span className="material-icons">settings</span>
          Settings
        </Link>
        <button type="button" onClick={() => void signOut()} className="sidebar-link w-full text-left">
          <span className="material-icons">logout</span>
          Sign out
        </button>

        <div className="sidebar-user mt-auto">
          <div className="avatar">VC</div>
          <div>
            <p className="text-sm font-semibold">Vince Charles</p>
            <p className="text-xs text-white/50">Administrator</p>
          </div>
          <span className="material-icons ml-auto text-white/40">more_horiz</span>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[#f6f8fa]">{children}</main>
      </div>
    </PendingRequestsContext.Provider>
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

      <div className="flex items-center gap-2">
        <AdminNotifications />
        <Link className="icon-button" href="/dashboard/settings" aria-label="Open settings">
          <span className="material-icons">tune</span>
        </Link>
      </div>
    </header>
  )
}
