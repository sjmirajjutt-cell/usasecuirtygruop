'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attendance } from '@/lib/supabase/database.types'

const supabase = createClient()

function elapsedHours(checkIn: string, now = Date.now()) {
  return Math.max(0, (now - new Date(checkIn).getTime()) / 3600000)
}

export function EmployeeAttendance({ employeeId, hourlyRate, initialOpen, initialHistory }: { employeeId: string; hourlyRate: number; initialOpen: Attendance | null; initialHistory: Attendance[] }) {
  const [openShift, setOpenShift] = useState(initialOpen)
  const [history, setHistory] = useState(initialHistory)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const refreshAttendance = async () => {
      const response = await fetch('/api/attendance', { cache: 'no-store' })
      if (!response.ok) return
      const result = await response.json()
      const rows = result.attendance as Attendance[]
      setHistory(rows)
      setOpenShift(rows.find(row => !row.check_out) ?? null)
    }
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshAttendance()
      }
    }
    const refreshTimer = window.setInterval(refreshIfVisible, 20000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshAttendance()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const channel = supabase.channel(`attendance-${employeeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `employee_id=eq.${employeeId}` }, payload => {
      const row = payload.new as Attendance
      if (payload.eventType === 'INSERT') { setHistory(rows => [row, ...rows.filter(item => item.id !== row.id)]); setOpenShift(row.check_out ? null : row) }
      if (payload.eventType === 'UPDATE') { setHistory(rows => rows.map(item => item.id === row.id ? row : item)); setOpenShift(row.check_out ? null : row) }
    }).subscribe()
    return () => { window.clearInterval(timer); window.clearInterval(refreshTimer); document.removeEventListener('visibilitychange', handleVisibilityChange); supabase.removeChannel(channel) }
  }, [employeeId, supabase])

  async function checkIn() {
    setLoading(true); setError('')
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }))
      const response = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }) })
      const result = await response.json()
      const data = result.attendance as Attendance | undefined
      if (!response.ok) setError(result.error?.includes('duplicate') ? 'You already have an active shift.' : result.error ?? 'Unable to check in.')
      else if (data) { setOpenShift(data); setHistory(rows => [data, ...rows]) }
    } catch { setError('Location permission is required. Allow browser location access and try checking in again.') }
    setLoading(false)
  }

  async function checkOut() {
    if (!openShift) return
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/attendance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: openShift.id }) })
      const result = await response.json()
      const data = result.attendance as Attendance | undefined
      if (!response.ok) setError(result.error ?? 'Unable to check out.')
      else if (data) { setOpenShift(null); setHistory(rows => rows.map(row => row.id === data.id ? data : row)) }
    } catch { setError('Unable to reach the attendance service. Please refresh and try again.') }
    setLoading(false)
  }

  const liveHours = openShift ? elapsedHours(openShift.check_in, now) : 0
  const totalHours = history.reduce((total, row) => total + (row.check_out ? Number(row.total_hours ?? 0) : liveHours), 0)
  const totalPayout = totalHours * hourlyRate
  return <div className="space-y-5">
    <section className="panel p-6"><div className="flex flex-wrap items-center justify-between gap-5"><div><span className="section-kicker">Live attendance</span><h3 className="mt-2 text-xl font-bold text-[#12263f]">{openShift ? 'You are checked in' : 'Ready for your shift?'}</h3><p className="mt-1 text-sm text-slate-500">{openShift ? `Started ${new Date(openShift.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Check in when you arrive at your assigned location.'}</p></div><div className="text-right"><strong className="block text-3xl text-[#12263f]">{liveHours.toFixed(2)}h</strong><small className="text-slate-500">Current shift</small></div><button onClick={openShift ? checkOut : checkIn} disabled={loading} className={`rounded-md px-6 py-3 text-sm font-bold text-white disabled:opacity-60 ${openShift ? 'bg-[#ee405a]' : 'bg-[#4eb4a5]'}`}>{loading ? 'Updating...' : openShift ? 'Check out' : 'Check in'}</button></div>{error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Total hours</span><strong className="mt-1 block text-xl text-[#12263f]">{totalHours.toFixed(2)}h</strong></div><div className="rounded-md bg-emerald-50 p-4"><span className="text-xs text-slate-500">Total payout</span><strong className="mt-1 block text-xl text-emerald-700">${totalPayout.toFixed(2)}</strong></div><div className="rounded-md bg-slate-50 p-4"><span className="text-xs text-slate-500">Hourly rate</span><strong className="mt-1 block text-xl text-[#12263f]">${hourlyRate.toFixed(2)}</strong></div></div></section>
    <section className="panel overflow-hidden"><div className="panel-heading"><div><span className="section-kicker">Attendance history</span><h3>Recent shifts</h3></div></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Check in</th><th className="px-6 py-3">Check out</th><th className="px-6 py-3">Hours</th><th className="px-6 py-3">Payout</th></tr></thead><tbody className="divide-y divide-slate-100">{history.map(row => { const rowHours = row.check_out ? Number(row.total_hours ?? 0) : liveHours; return <tr key={row.id}><td className="px-6 py-4">{new Date(row.check_in).toLocaleString('en-US')}</td><td className="px-6 py-4">{row.check_out ? new Date(row.check_out).toLocaleString('en-US') : <span className="font-semibold text-[#4eb4a5]">Active now</span>}</td><td className="px-6 py-4 font-semibold">{rowHours.toFixed(2)}</td><td className="px-6 py-4 font-semibold text-emerald-700">${(rowHours * hourlyRate).toFixed(2)}</td></tr> })}</tbody></table>{history.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No attendance records yet.</p>}</div></section>
  </div>
}