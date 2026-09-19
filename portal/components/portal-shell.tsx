'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/dashboard/worksheets', label: 'Worksheets', icon: 'assignment' },
  { href: '/dashboard/invoices', label: 'Invoices', icon: 'receipt' },
  { href: '/dashboard/employees', label: 'Employees', icon: 'people' }
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
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

        <p className="sidebar-label mt-8">Account</p>
        <Link href="/dashboard/settings" className={`sidebar-link ${pathname.startsWith('/dashboard/settings') ? 'sidebar-link-active' : ''}`}>
          <span className="material-icons">settings</span>
          Settings
        </Link>

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
  )
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="page-header"><div><div className="breadcrumb"><span>Home</span><span>/</span><strong>{eyebrow}</strong></div><h2>{title}</h2><p>{description}</p></div><Link className="icon-button" href="/dashboard/settings" aria-label="Open settings"><span className="material-icons">tune</span></Link></header>
}
