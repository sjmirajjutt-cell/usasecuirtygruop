import Link from 'next/link'
import { PageHeader } from '@/components/portal-shell'

const steps = [
  {
    number: '1',
    href: '/dashboard/employees',
    title: 'Add employee',
    description: 'Add staff and type or verify their work location.',
    icon: 'person_add',
    tone: 'blue'
  },
  {
    number: '2',
    href: '/dashboard/attendance',
    title: 'Attendance',
    description: 'Check in staff and track daily shifts.',
    icon: 'event_available',
    tone: 'teal'
  },
  {
    number: '3',
    href: '/dashboard/payroll',
    title: 'Payroll',
    description: 'Review hours and employee payouts.',
    icon: 'payments',
    tone: 'amber'
  }
]

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Home"
        title="Daily operations"
        description="Add your team, record attendance, and review payroll."
      />

      <section className="dashboard-content">
        <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#12263f_0%,#1b3c5e_100%)] p-6 text-white shadow-[0_20px_45px_rgba(18,38,63,0.18)] sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">Operations portal</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">Welcome back</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
            Add an employee and enter their work location. You can verify a new location on the map as you add them.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className="group block rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Step {step.number}
                </span>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${step.tone === 'blue' ? 'bg-[#e9f4ff] text-[#4b98cf]' : step.tone === 'teal' ? 'bg-[#e7f9f5] text-[#2ea58a]' : 'bg-[#fff5df] text-[#d29b2c]'}`}>
                  <span className="material-icons">{step.icon}</span>
                </span>
              </div>

              <h3 className="text-2xl font-bold tracking-[-0.04em] text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#4b98cf]">
                Open now
                <span className="material-icons text-base transition group-hover:translate-x-1">arrow_forward</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4b98cf]">Simple flow</p>
          <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">Keep it easy for the team</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Enter an employee’s work location while adding them. New locations are saved for GPS attendance and can be reused for other employees.
          </p>
        </div>
      </section>
    </>
  )
}
