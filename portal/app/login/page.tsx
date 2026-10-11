import { LoginForm } from '@/components/login-form'

const featureHighlights = [
  'Secure staff access',
  'Daily attendance tracking',
  'Payroll and invoice review'
]

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#edf6fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200 bg-[linear-gradient(135deg,#f3f9ff_0%,#eef8f6_100%)] p-10 text-slate-800 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(75,152,207,0.16),_transparent_44%)]" />

          <div className="relative z-10 flex items-center gap-4">
            <img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Group" className="h-14 w-14 rounded-2xl border border-slate-200 bg-white p-2 object-contain shadow-sm" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4b98cf]">USSPG</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">USA Security & Protection Group</h2>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4b98cf]">Employee portal</p>
              <h1 className="max-w-md text-4xl font-bold leading-tight tracking-[-0.04em] text-slate-900">Simple, clear access to your daily operations.</h1>
            </div>

            <div className="grid gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <span className="material-icons text-[#4b98cf]">verified_user</span>
                <span>Safe login and staff management</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <span className="material-icons text-[#4b98cf]">schedule</span>
                <span>Track attendance and shifts quickly</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                <span className="material-icons text-[#4b98cf]">payments</span>
                <span>Review payroll and invoices in one place</span>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {featureHighlights.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm">{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white p-5 sm:p-8 lg:p-12">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
