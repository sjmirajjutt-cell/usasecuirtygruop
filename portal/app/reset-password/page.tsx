'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function establishRecoverySession() {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = url.searchParams.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const recoveryError = hash.get('error_description') || url.searchParams.get('error_description')

      if (recoveryError) {
        if (active) setError(decodeURIComponent(recoveryError.replace(/\+/g, ' ')))
        return
      }

      let authError: { message: string } | null = null
      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        authError = result.error
        if (authError?.message.toLowerCase().includes('code verifier')) {
          setError('This reset link was opened in another browser or device. Request a new reset link from the login page.')
          return
        }
      } else if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        authError = result.error
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (authError || sessionError || !session) {
        setError(authError?.message || sessionError?.message || 'This reset link is invalid or expired. Please request a new link.')
        return
      }
      setSessionReady(true)
      window.history.replaceState({}, document.title, '/reset-password')
    }

    void establishRecoverySession()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) setSessionReady(true)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    if (!sessionReady) {
      setError('Recovery session is not ready. Please open the reset link again.')
      return
    }

    setSaving(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('Password changed successfully. You can now sign in.')
    setTimeout(() => router.push('/login'), 1200)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <span className="section-kicker">Account security</span>
        <h1 className="mt-2 text-2xl font-bold text-[#12263f]">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-500">Choose a new password for your employee portal account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#4b98cf] focus:bg-white" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input required minLength={8} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#4b98cf] focus:bg-white" />
          </label>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <button disabled={saving || !sessionReady} type="submit" className="w-full rounded-lg bg-[#12263f] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? 'Saving...' : sessionReady ? 'Change password' : 'Preparing secure session...'}
          </button>
        </form>
      </section>
    </main>
  )
}
