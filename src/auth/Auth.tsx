import { ArrowUpRight, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { readableAuthError } from '../lib/formatters'
import { FundWorkspace } from '../dashboard/FundWorkspace'

export function SetupScreen() {
  return (
    <main className="setup-page">
      <div className="setup-card">
        <div className="brand-mark"><Wallet size={22} /></div>
        <span className="eyebrow">BATCH FUND · SETUP</span>
        <h1>One last connection.</h1>
        <p className="setup-lead">
          Add your Supabase project details to enable shared sign-in and live
          fund records across devices.
        </p>
        <ol className="setup-steps">
          <li><span>1</span><div><strong>Create a Supabase project</strong><small>Use the project your group will share.</small></div></li>
          <li><span>2</span><div><strong>Run the database setup</strong><small>Paste <code>supabase/schema.sql</code> into the SQL Editor and run it.</small></div></li>
          <li><span>3</span><div><strong>Add environment variables</strong><small>Copy <code>.env.example</code> to <code>.env.local</code>, then fill in the project URL and anon key.</small></div></li>
        </ol>
        <div className="setup-note">
          <ShieldCheck size={18} />
          <p>Use only the public anon key in this app. Never put a Supabase service-role key in browser code.</p>
        </div>
        <p className="setup-footer">Deploy the app to Vercel after setting the same variables in Project Settings → Environment Variables.</p>
      </div>
    </main>
  )
}

export function ConnectedApp({ client }: { client: NonNullable<typeof supabase> }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(readableAuthError(error.message))
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  if (authLoading) {
    return <main className="loading-screen"><span className="spinner" /><p>Connecting to your fund…</p></main>
  }
  if (!session) {
    return <AuthScreen client={client} error={authError} setError={setAuthError} />
  }
  return <FundWorkspace client={client} session={session} />
}

export function AuthScreen({
  client,
  error,
  setError,
}: {
  client: NonNullable<typeof supabase>
  error: string
  setError: (message: string) => void
}) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const result = isSignUp
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setError(readableAuthError(result.error.message))
      return
    }
    if (isSignUp && !result.data.session) {
      setNotice('Check your email to confirm your account, then sign in here.')
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-aside">
        <div className="brand-lockup"><span className="brand-mark"><Wallet size={21} /></span><span>Batch<span className="brand-light">fund</span></span></div>
        <div className="auth-art">
          <div className="art-glow" />
          <div className="art-card art-card-back"><span>EVENT COLLECTIONS</span><strong>Batch events</strong><small>Tracked separately, together</small></div>
          <div className="art-card art-card-front"><span>MONTHLY CONTRIBUTION</span><strong>LKR 500</strong><div className="art-progress"><i /></div><small>Standard amount per member</small></div>
          <div className="art-dot art-dot-one" /><div className="art-dot art-dot-two" />
        </div>
        <div className="auth-aside-copy"><span className="eyebrow">YOUR BATCH, IN BALANCE</span><h2>Good records.<br />Good times together.</h2><p>A clear, shared place for monthly contributions and the moments you collect for.</p></div>
        <span className="auth-copyright">PRIVATE TO YOUR BATCH · LKR</span>
      </div>
      <section className="auth-main">
        <div className="mobile-brand brand-lockup"><span className="brand-mark"><Wallet size={21} /></span><span>Batch<span className="brand-light">fund</span></span></div>
        <div className="auth-form-wrap">
          <span className="eyebrow">UNIVERSITY BATCH FUND</span>
          <h1>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-subtitle">{isSignUp ? 'Join your batch’s shared fund workspace.' : 'Sign in to see how your batch fund is doing.'}</p>
          <form onSubmit={submit} className="auth-form">
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label>Password<input type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required /></label>
            {error && <div className="form-alert" role="alert">{error}</div>}
            {notice && <div className="form-success" role="status">{notice}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}<ArrowUpRight size={17} /></button>
          </form>
          <p className="auth-toggle">{isSignUp ? 'Already have an account?' : 'New to the workspace?'} <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice('') }}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
          <div className="auth-privacy"><ShieldCheck size={16} /><span>Access is limited to approved batch members.</span></div>
        </div>
        <span className="auth-mobile-footer">UNIVERSITY BATCH FUND · LKR</span>
      </section>
    </main>
  )
}
