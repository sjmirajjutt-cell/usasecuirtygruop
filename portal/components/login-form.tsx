'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (signInError) setError(signInError.message)
    else {
      const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', data.user.id).single()
      if (profile?.is_active === false) {
        await supabase.auth.signOut()
        setError('This employee account is inactive. Please contact the admin team.')
      } else if (profile?.role === 'admin') window.location.assign('/dashboard')
      else {
        await supabase.auth.signOut()
        setError('Employee sign-in is disabled. Please contact the administrator.')
      }
    }
    setLoading(false)
  }

  async function sendResetLink() {
    const normalizedEmail = email.trim().toLowerCase()
    setError('')
    setNotice('')
    if (!normalizedEmail) {
      setError('Enter your email first so we can send the reset link.')
      return
    }

    setSendingReset(true)
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: 'https://usasecuritygruop.vercel.app/reset-password'
    })
    setSendingReset(false)
    if (resetError) setError(resetError.message)
    else setNotice('A password reset link has been sent to your email.')
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,29,45,0.10)] sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <img src="/bizzark/assets/logo/usasecuirtygrouplogo.png" alt="USA Security Group" className="h-12 w-12 rounded-xl bg-slate-100 p-2 object-contain shadow-sm" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4b98cf]">Access portal</p>
          <p className="mt-1 text-xs text-slate-500">Simple secure sign in</p>
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#12263f]">Welcome</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to manage employees, attendance, payroll, and client activity with ease.</p>

      <div className="mt-8 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Email address
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#4b98cf] focus:bg-white focus:ring-4 focus:ring-[#4b98cf]/10"
            type="password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </label>
      </div>

      {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={() => void sendResetLink()} disabled={sendingReset} className="font-semibold text-[#4b98cf] transition hover:text-[#2b6ea3] disabled:opacity-60">
          {sendingReset ? 'Sending reset link...' : 'Forgot password?'}
        </button>
        <span className="text-slate-400">Need help?</span>
      </div>

      <button
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#12263f] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#12263f]/15 transition hover:bg-[#0f1c2d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
