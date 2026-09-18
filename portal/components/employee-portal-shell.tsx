'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function EmployeePortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  return <div className="min-h-screen bg-[#f6f8fa]"><header className="flex items-center justify-between border-b border-slate-200 bg-[#12263f] px-6 py-4 text-white lg:px-12"><div className="flex items-center gap-3"><div className="brand-mark">US</div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8ed4c8]">USSPG</p><strong className="block text-sm">Employee portal</strong></div></div><button onClick={signOut} className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"><span className="material-icons">logout</span>Sign out</button></header><main>{children}</main></div>
}