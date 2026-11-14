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
          <li><span>3</span><div><strong>Add environment variables</strong><small>Copy <code>.env.example</code> to <code>.env.local</code>, then fill in the project URL and publishable key.</small></div></li>
        </ol>
        <div className="setup-note">
          <ShieldCheck size={18} />
          <p>Use only the public publishable key in this app. Never put a Supabase service-role key in browser code.</p>
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
  const [passwordRecovery, setPasswordRecovery] = useState(() => (
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'
  ))

  useEffect(() => {
    let active = true
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setAuthError(readableAuthError(error.message))
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthError('')
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  if (authLoading) {
    return <main className="loading-screen"><span className="spinner" /><p>Connecting to your fund…</p></main>
  }
  if (passwordRecovery) {
    return <PasswordRecoveryScreen client={client} onComplete={() => setPasswordRecovery(false)} />
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
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    if (isForgotPassword) {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      setBusy(false)
      if (resetError) {
        setError(readableAuthError(resetError.message))
        return
      }
      setNotice('If an account exists for this email, a password reset link is on its way.')
      return
    }

    const result = isSignUp
      ? await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      : await client.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setError(readableAuthError(result.error.message))
      return
    }
    if (isSignUp && !result.data.session) {
      setNotice('Check your email to confirm your account. You can sign in as soon as it is confirmed.')
    }
  }

  const title = isForgotPassword
    ? 'Reset your password'
    : isSignUp
      ? 'Create your account'
      : 'Welcome back'

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
          <h1>{title}</h1>
          <p className="auth-subtitle">
            {isForgotPassword
              ? 'Enter your account email and we’ll send you a password reset link.'
              : isSignUp
                ? 'Join your batch’s shared fund workspace.'
                : 'Sign in to see how your batch fund is doing.'}
          </p>
          <form onSubmit={submit} className="auth-form">
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            {!isForgotPassword && <label>Password<input type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required /></label>}
            {error && <div className="form-alert" role="alert">{error}</div>}
            {notice && <div className="form-success" role="status">{notice}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : isForgotPassword ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'}<ArrowUpRight size={17} /></button>
          </form>
          {isForgotPassword
            ? <p className="auth-toggle"><button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setNotice('') }}>Back to sign in</button></p>
            : <>
              {!isSignUp && <p className="auth-toggle"><button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setNotice('') }}>Forgot password?</button></p>}
              <p className="auth-toggle">{isSignUp ? 'Already have an account?' : 'New to the workspace?'} <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice('') }}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
            </>}
          <div className="auth-privacy"><ShieldCheck size={16} /><span>Confirm your email to access the shared fund summary.</span></div>
        </div>
        <span className="auth-mobile-footer">UNIVERSITY BATCH FUND · LKR</span>
      </section>
    </main>
  )
}

function PasswordRecoveryScreen({
  client,
  onComplete,
}: {
  client: NonNullable<typeof supabase>
  onComplete: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    const { error: updateError } = await client.auth.updateUser({ password })
    setBusy(false)
    if (updateError) {
      setError(readableAuthError(updateError.message))
      return
    }
    onComplete()
  }

  return (
    <main className="auth-page auth-recovery-page">
      <section className="auth-main">
        <div className="auth-form-wrap">
          <span className="eyebrow">UNIVERSITY BATCH FUND</span>
          <h1>Choose a new password</h1>
          <p className="auth-subtitle">Set a new password for your account.</p>
          <form onSubmit={submit} className="auth-form">
            <label>New password<input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required /></label>
            <label>Confirm password<input type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your new password again" required /></label>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : 'Update password'}<ArrowUpRight size={17} /></button>
          </form>
        </div>
      </section>
    </main>
  )
}
