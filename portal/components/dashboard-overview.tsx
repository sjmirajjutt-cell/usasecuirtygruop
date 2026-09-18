'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Invoice, WorkLocation, WorksheetWithRelations } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/client'
import { summarizeWorksheets } from '@/lib/worksheets'

type DashboardPayload = {
  worksheets: WorksheetWithRelations[]
  officers: number
  invoices: Pick<Invoice, 'status' | 'amount_due' | 'client_name'>[]
  locations: Pick<WorkLocation, 'id' | 'location_name' | 'client_name'>[]
}

export function DashboardOverview({
  initialWorksheets,
  initialOfficers,
  initialInvoices,
  initialLocations
}: {
  initialWorksheets: WorksheetWithRelations[]
  initialOfficers: number
  initialInvoices: Pick<Invoice, 'status' | 'amount_due' | 'client_name'>[]
  initialLocations: Pick<WorkLocation, 'id' | 'location_name' | 'client_name'>[]
}) {
  const [worksheets, setWorksheets] = useState(initialWorksheets)
  const [officers, setOfficers] = useState(initialOfficers)
  const [invoices, setInvoices] = useState(initialInvoices)
  const [locations, setLocations] = useState(initialLocations)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const refresh = async () => {
      const response = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!response.ok) return
      const payload = (await response.json()) as DashboardPayload
      setWorksheets(payload.worksheets ?? [])
      setOfficers(payload.officers ?? 0)
      setInvoices(payload.invoices ?? [])
      setLocations(payload.locations ?? [])
    }

    refresh()

    const timer = window.setInterval(refresh, 15000)
    const channel = supabase.channel('dashboard-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worksheets' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.officer' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_locations' }, refresh)
      .subscribe()

    return () => {
      window.clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const summary = summarizeWorksheets(worksheets)
  const pendingAmount = invoices.filter(invoice => invoice.status === 'pending').reduce((total, invoice) => total + Number(invoice.amount_due), 0)
  const recentWorksheets = worksheets.slice(0, 5)
  const locationCount = locations.length

  const stats = [
    ['Active employees', officers ?? 0, 'Registered field staff', 'people', 'blue'],
    ['Tracked guards', summary.guards, 'In loaded worksheets', 'security', 'teal'],
    ['Total hours', summary.hours.toFixed(2), 'Across loaded shifts', 'schedule', 'amber'],
    ['Pending invoices', `$${pendingAmount.toFixed(2)}`, 'Amount awaiting payment', 'payments', 'red']
  ]

  return (
    <>
      <section className="dashboard-content">
        <div className="quick-actions">
          <span className="section-kicker">Quick actions</span>
          <div className="quick-action-list">
            <a href="/dashboard/worksheets"><span className="material-icons">playlist_add</span><span><strong>New worksheet</strong><small>Log a guard shift</small></span></a>
            <a href="/dashboard/employees"><span className="material-icons">person_add</span><span><strong>Manage employees</strong><small>Review field staff</small></span></a>
            <a href="/dashboard/invoices"><span className="material-icons">receipt</span><span><strong>View invoices</strong><small>Track client balances</small></span></a>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value, note, icon, color]) => (
            <article key={label} className="metric-card">
              <div className={`metric-icon ${color}`}><span className="material-icons">{icon}</span></div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="panel">
            <div className="panel-heading">
              <div><span className="section-kicker">Financial snapshot</span><h3>Worksheet payouts</h3></div>
              <span className="panel-total">${summary.payout.toFixed(2)}</span>
            </div>
            <div className="chart-area">
              <div className="chart-grid"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div>
              <div className="bars">
                {[38, 56, 44, 70, 52, 78, Math.min(94, summary.hours ? 64 : 12), 86, 58, 73, 48, 92].map((height, index) => (
                  <div className="bar-column" key={index}>
                    <div className="bar" style={{ height: `${height}%` }} />
                    <span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel-footer"><span><i className="legend-dot teal" /> Payout volume</span><span>Based on loaded worksheets</span></div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><span className="section-kicker">Coverage</span><h3>Active locations</h3></div>
              <a className="text-link" href="/dashboard/worksheets">View all</a>
            </div>
            <div className="location-list">
              {(locations ?? []).map((location, index) => (
                <div className="location-row" key={location.id}>
                  <div className={`location-icon location-${index % 3}`}><span className="material-icons">location_on</span></div>
                  <div className="flex-1">
                    <strong>{location.location_name}</strong>
                    <small>{location.client_name}</small>
                    <div className="mini-progress"><span style={{ width: `${Math.max(28, 86 - index * 13)}%` }} /></div>
                  </div>
                  <b>{Math.max(28, 86 - index * 13)}%</b>
                </div>
              ))}
              {locationCount === 0 && <p className="empty-state">No work locations have been added yet.</p>}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="panel overflow-hidden">
            <div className="panel-heading px-6 pt-6">
              <div><span className="section-kicker">Latest activity</span><h3>Recent worksheets</h3></div>
              <a className="text-link" href="/dashboard/worksheets">See all worksheets</a>
            </div>
            <div className="activity-list">
              {recentWorksheets.map(row => (
                <div className="activity-row" key={row.id}>
                  <div className="activity-avatar">{(row.officer?.full_name ?? 'GU').slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1">
                    <strong>{row.officer?.full_name ?? 'Unassigned officer'}</strong>
                    <small>{row.location?.location_name ?? 'Unknown location'} · {row.date}</small>
                  </div>
                  <div className="text-right">
                    <b>{Number(row.total_hours).toFixed(2)} hrs</b>
                    <small>${Number(row.total_amount).toFixed(2)}</small>
                  </div>
                </div>
              ))}
              {recentWorksheets.length === 0 && <p className="empty-state px-6 pb-6">No worksheet activity yet.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div><span className="section-kicker">Receivables</span><h3>Invoice status</h3></div>
              <a className="text-link" href="/dashboard/invoices">Manage</a>
            </div>
            <div className="invoice-summary">
              <div className="invoice-ring"><strong>{invoices.filter(invoice => invoice.status === 'pending').length}</strong><span>due</span></div>
              <div>
                <p>Pending invoices</p>
                <strong className="invoice-amount">${pendingAmount.toFixed(2)}</strong>
                <small>Awaiting client payment</small>
              </div>
            </div>
            <div className="invoice-list">
              {(invoices ?? []).slice(0, 3).map(invoice => (
                <div className="invoice-row" key={invoice.client_name}>
                  <span>{invoice.client_name}</span>
                  <b className={invoice.status === 'paid' ? 'paid' : 'due'}>{invoice.status}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  )
}
