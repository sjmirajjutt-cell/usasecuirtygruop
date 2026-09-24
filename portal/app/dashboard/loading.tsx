export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f6f8fa]" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-header animate-pulse">
        <div>
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-8 w-64 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-200" />
        </div>
        <div className="h-10 w-24 rounded-xl bg-slate-200" />
      </div>
      <section className="dashboard-content animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-32 rounded-2xl bg-white shadow-sm" />
          <div className="h-32 rounded-2xl bg-white shadow-sm" />
          <div className="h-32 rounded-2xl bg-white shadow-sm" />
          <div className="h-32 rounded-2xl bg-white shadow-sm" />
        </div>
        <div className="mt-6 h-80 rounded-2xl bg-white shadow-sm" />
      </section>
    </div>
  )
}
