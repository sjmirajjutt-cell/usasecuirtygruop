import { PageHeader } from '@/components/portal-shell'
import { EmployeeAttendance } from '@/components/employee-attendance'
import { createClient } from '@/lib/supabase/server'
import type { Attendance, Profile } from '@/lib/supabase/database.types'

export default async function EmployeePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: attendance }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, employee_id, phone, address, hourly_rate').eq('id', user.id).single(),
    supabase.from('attendance').select('*').eq('employee_id', user.id).order('check_in', { ascending: false }).limit(30)
  ])
  const typedProfile = profile as Pick<Profile, 'full_name' | 'employee_id' | 'phone' | 'address' | 'hourly_rate'> | null
  const rows = (attendance ?? []) as Attendance[]
  const openShift = rows.find(row => !row.check_out) ?? null
  return <><PageHeader eyebrow="Employee portal" title={`Welcome, ${typedProfile?.full_name ?? 'Employee'}`} description="Track your live shift and review your attendance hours." /><section className="dashboard-content"><div className="grid gap-5 lg:grid-cols-[.8fr_1.7fr]"><section className="panel p-6"><span className="section-kicker">Employee profile</span><h3 className="mt-2 text-xl font-bold text-[#12263f]">{typedProfile?.full_name}</h3><p className="mt-1 text-sm text-slate-500">Employee ID: {typedProfile?.employee_id ?? 'Not assigned'}</p><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-slate-400">Phone</dt><dd className="mt-1 font-semibold text-[#12263f]">{typedProfile?.phone || 'Not provided'}</dd></div><div><dt className="text-slate-400">Address</dt><dd className="mt-1 font-semibold text-[#12263f]">{typedProfile?.address || 'Not provided'}</dd></div><div><dt className="text-slate-400">Hourly rate</dt><dd className="mt-1 font-semibold text-[#12263f]">${Number(typedProfile?.hourly_rate ?? 0).toFixed(2)}</dd></div></dl></section><EmployeeAttendance employeeId={user.id} initialOpen={openShift} initialHistory={rows} /></div></section></>
}