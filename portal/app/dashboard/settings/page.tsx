import { PageHeader } from '@/components/portal-shell'

export default function SettingsPage() {
  return <>
    <PageHeader eyebrow="Account" title="Settings" description="Review portal preferences and administrator account details." />
    <section className="dashboard-content">
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-6">
          <span className="section-kicker">Administrator</span>
          <h3 className="mt-2 text-lg font-bold text-[#12263f]">Vince Charles</h3>
          <p className="mt-1 text-sm text-slate-500">Administrator access for USA Security & Protection Group.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4"><span className="text-xs text-slate-400">Role</span><strong className="mt-1 block text-sm text-[#12263f]">Administrator</strong></div>
            <div className="rounded-md border border-slate-200 p-4"><span className="text-xs text-slate-400">Portal</span><strong className="mt-1 block text-sm text-[#12263f]">Operations command center</strong></div>
          </div>
        </section>
        <section className="panel p-6">
          <span className="section-kicker">Workspace</span>
          <h3 className="mt-2 text-lg font-bold text-[#12263f]">Operations preferences</h3>
          <div className="mt-5 space-y-4 text-sm">
            <label className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4"><span><strong className="block text-[#12263f]">Worksheet reporting</strong><small className="text-slate-500">Use the current loaded worksheet window.</small></span><input type="checkbox" defaultChecked className="h-4 w-4 accent-[#4b98cf]" /></label>
            <label className="flex items-center justify-between gap-4"><span><strong className="block text-[#12263f]">Invoice tracking</strong><small className="text-slate-500">Show pending balances on the dashboard.</small></span><input type="checkbox" defaultChecked className="h-4 w-4 accent-[#4b98cf]" /></label>
          </div>
        </section>
      </div>
    </section>
  </>
}