'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    else {
      const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', data.user.id).single()
      if (profile?.is_active === false) {
        await supabase.auth.signOut()
        setError('This employee account is inactive. Contact Vince Charles.')
      } else window.location.assign(profile?.role === 'officer' ? '/employee' : '/dashboard')
    }
    setLoading(false)
  }

  return <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#4b98cf]">Operations portal</p>
    <h1 className="text-3xl font-bold text-[#12263f]">USA Security & Protection Group</h1>
    <p className="mt-2 text-sm text-slate-500">Sign in to manage guard operations.</p>
    <label className="mt-8 block text-sm font-semibold">Email<input className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
    <label className="mt-4 block text-sm font-semibold">Password<input className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3" type="password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={loading} className="mt-6 w-full rounded-lg bg-[#4b98cf] px-4 py-3 font-bold text-white disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in'}</button>
  </form>
}
