import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1d3b5e_0%,_#12263f_45%,_#0f1d2d_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(6,15,29,0.45)] backdrop-blur-sm lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0d1d2d] p-10 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(75,152,207,0.28),_transparent_40%)]" />
          <div className="relative z-10 flex items-center gap-4">
            <img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Group" className="h-14 w-14 rounded-2xl bg-white/95 p-2 object-contain" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8ed4c8]">USSPG</p>
              <h2 className="mt-1 text-xl font-semibold">USA Security & Protection Group</h2>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8ed4c8]">Operations portal</p>
              <h1 className="max-w-md text-4xl font-bold leading-tight tracking-[-0.04em]">Field operations, staffing, and compliance in one place.</h1>
            </div>
            <div className="grid gap-3 text-sm text-slate-200/90">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="material-icons text-[#8ed4c8]">verified_user</span>
                <span>Secure employee and attendance management</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="material-icons text-[#8ed4c8]">timeline</span>
                <span>Live updates for worksheets and invoices</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-sm text-slate-300">
            Trusted operations for security staffing and client readiness.
          </div>
        </div>

        <div className="flex items-center justify-center bg-white p-6 sm:p-8 lg:p-12">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
