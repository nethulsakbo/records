import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Coins,
  Download,
  Ellipsis,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import type { AppRole, EntryType } from './lib/database.types'
import { supabase } from './lib/supabase'
import './App.css'

type Member = {
  id: string
  registration_number: number
  full_name: string
  is_active: boolean
  created_at: string
}

type LedgerEntry = {
  id: string
  entry_type: EntryType
  amount: number
  member_id: string | null
  period_month: string | null
  event_name: string | null
  notes: string | null
  entry_date: string
  created_by: string
  created_at: string
}

type EntryDraft = {
  entry_type: EntryType
  amount: number
  member_id: string | null
  period_month: string | null
  event_name: string | null
  notes: string | null
  entry_date: string
}

type Tab = 'overview' | 'contributions' | 'members' | 'transactions'
type TransactionFilter = 'all' | 'event' | 'expense'

const MONTHLY_CONTRIBUTION = 500
const money = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})
const longDate = new Intl.DateTimeFormat('en-LK', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const shortDate = new Intl.DateTimeFormat('en-LK', {
  day: 'numeric',
  month: 'short',
})

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function displayMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-LK', {
    month: 'long',
    year: 'numeric',
  })
}

function displayName(entry: LedgerEntry, members: Member[]) {
  const member = members.find((item) => item.id === entry.member_id)
  return member ? `#${member.registration_number} · ${member.full_name}` : null
}

function readableAuthError(message: string) {
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
    return 'Could not reach Supabase. Check that the project URL and public anon key are correct and from the same project, and that the project is active. After changing environment variables, restart the local dev server or redeploy on Vercel.'
  }
  return message
}

function App() {
  if (!supabase) return <SetupScreen />
  return <ConnectedApp client={supabase} />
}

function SetupScreen() {
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

function ConnectedApp({ client }: { client: NonNullable<typeof supabase> }) {
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

function AuthScreen({
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

function FundWorkspace({
  client,
  session,
}: {
  client: NonNullable<typeof supabase>
  session: Session
}) {
  const [role, setRole] = useState<AppRole | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'member' | 'entry' | null>(null)
  const [entryDefaults, setEntryDefaults] = useState<Partial<EntryDraft>>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isAdmin = role === 'admin'

  const loadData = useCallback(async (userId: string) => {
    const profileResult = await client.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (profileResult.error) {
      setError(profileResult.error.message)
      setLoading(false)
      return
    }
    if (!profileResult.data) {
      setError('Your account profile is missing. Ask an administrator to check the database setup.')
      setLoading(false)
      return
    }
    if (profileResult.data.role === 'pending') {
      setRole('pending')
      setMembers([])
      setEntries([])
      setError('')
      setLoading(false)
      return
    }
    const memberResult = await client.from('members').select('*').order('registration_number')
    if (memberResult.error) {
      setError(memberResult.error.message)
      setLoading(false)
      return
    }
    const allEntries: LedgerEntry[] = []
    for (let offset = 0; ; offset += 1000) {
      const entryResult = await client
        .from('ledger_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 999)
      if (entryResult.error) {
        setError(entryResult.error.message)
        setLoading(false)
        return
      }
      allEntries.push(...entryResult.data)
      if (entryResult.data.length < 1000) break
    }
    setRole(profileResult.data.role)
    setMembers(memberResult.data)
    setEntries(allEntries)
    setError('')
    setLoading(false)
  }, [client])

  useEffect(() => {
    void Promise.resolve().then(() => loadData(session.user.id))
    const intervalId = window.setInterval(() => void loadData(session.user.id), 30000)
    return () => window.clearInterval(intervalId)
  }, [loadData, session.user.id])

  const activeMembers = useMemo(() => members.filter((member) => member.is_active), [members])
  const monthEntries = useMemo(() => entries.filter((entry) => (
    entry.entry_type === 'monthly'
      ? entry.period_month?.startsWith(month)
      : entry.entry_date.startsWith(month)
  )), [entries, month])
  const monthlyTotal = monthEntries
    .filter((entry) => entry.entry_type === 'monthly')
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
  const eventTotal = monthEntries
    .filter((entry) => entry.entry_type === 'event')
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
  const expenseTotal = entries
    .filter((entry) => entry.entry_type === 'expense')
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
  const lifetimeInflow = entries
    .filter((entry) => entry.entry_type !== 'expense')
    .reduce((sum, entry) => sum + Number(entry.amount), 0)
  const balance = lifetimeInflow - expenseTotal
  const monthlyPayments = monthEntries.filter((entry) => entry.entry_type === 'monthly')
  const paidMemberIds = new Set(monthlyPayments.map((entry) => entry.member_id).filter(Boolean))
  const paidCount = paidMemberIds.size
  const dueCount = Math.max(0, activeMembers.length - paidCount)
  const monthlyTarget = activeMembers.length * MONTHLY_CONTRIBUTION
  const progress = monthlyTarget ? Math.min(100, Math.round((monthlyTotal / monthlyTarget) * 100)) : 0

  async function recordEntry(draft: EntryDraft) {
    setSaving(true)
    setError('')
    const { error: saveError } = await client.from('ledger_entries').insert({
      ...draft,
      created_by: session.user.id,
    })
    setSaving(false)
    if (saveError) {
      setError(saveError.code === '23505'
        ? 'A monthly contribution for this member and month is already recorded.'
        : saveError.message)
      return
    }
    setModal(null)
    setEntryDefaults({})
    await loadData(session.user.id)
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const registration = Number(formData.get('registration_number'))
    const fullName = String(formData.get('full_name') ?? '').trim()
    if (!registration || registration < 1 || registration > 220 || !fullName) return
    setSaving(true)
    setError('')
    const { error: addError } = await client.from('members').insert({
      registration_number: registration,
      full_name: fullName,
    })
    setSaving(false)
    if (addError) {
      setError(addError.code === '23505'
        ? `Registration number ${registration} is already in use.`
        : addError.message)
      return
    }
    setModal(null)
    await loadData(session.user.id)
  }

  async function toggleMember(member: Member) {
    const action = member.is_active ? 'archive' : 'restore'
    if (member.is_active && !window.confirm(`Archive ${member.full_name}? Their past contributions will remain in the records.`)) return
    setError('')
    const { error: updateError } = await client
      .from('members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, is_active: !item.is_active } : item))
    if (action === 'restore') setError('')
  }

  async function deleteEntry(entry: LedgerEntry) {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return
    setError('')
    const { error: deleteError } = await client.from('ledger_entries').delete().eq('id', entry.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setEntries((current) => current.filter((item) => item.id !== entry.id))
  }

  async function signOut() {
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) setError(signOutError.message)
  }

  function openEntry(entryType: EntryType = 'monthly', memberId: string | null = null) {
    setEntryDefaults({
      entry_type: entryType,
      member_id: memberId,
      period_month: `${month}-01`,
      entry_date: today(),
      amount: entryType === 'monthly' ? MONTHLY_CONTRIBUTION : 0,
    })
    setModal('entry')
  }

  const navItems: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Wallet size={18} /> },
    { key: 'contributions', label: 'Contributions', icon: <Coins size={18} /> },
    { key: 'members', label: 'Members', icon: <Users size={18} /> },
    { key: 'transactions', label: 'Transactions', icon: <ArrowDownLeft size={18} /> },
  ]

  if (loading) {
    return <main className="loading-screen"><span className="spinner" /><p>Loading your fund records…</p></main>
  }
  if (role === null) {
    return (
      <main className="loading-screen setup-error">
        <ShieldCheck size={28} />
        <h1>We couldn’t load your workspace.</h1>
        <p>{error || 'Check the Supabase database setup and try again.'}</p>
        <button className="button button-secondary" onClick={() => { setLoading(true); void loadData(session.user.id) }}>Try again</button>
        <button className="text-button" onClick={() => void signOut()}>Sign out</button>
      </main>
    )
  }
  if (role === 'pending') {
    return (
      <main className="loading-screen setup-error">
        <Clock3 size={28} />
        <h1>Your account is awaiting approval.</h1>
        <p>A fund administrator needs to approve your account before you can view the batch records.</p>
        <button className="button button-secondary" onClick={() => { setLoading(true); void loadData(session.user.id) }}>Check again</button>
        <button className="text-button" onClick={() => void signOut()}>Sign out</button>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark"><Wallet size={20} /></span><span>Batch<span className="brand-light">fund</span></span></div>
        <div className="batch-switcher"><div className="batch-avatar">UB</div><div><strong>University batch</strong><span>Shared fund</span></div><ChevronDown size={16} /></div>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.key} className={`nav-item ${tab === item.key ? 'nav-item-active' : ''}`} onClick={() => { setTab(item.key); setMobileNavOpen(false) }}>
              {item.icon}<span>{item.label}</span>{item.key === 'contributions' && <span className="nav-count">{dueCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-rule" />
          <div className="sidebar-hint"><div className="hint-icon"><BadgeCheck size={17} /></div><div><strong>Every rupee, accounted for</strong><span>Shared records for your batch.</span></div></div>
          <button className="user-menu" onClick={() => void signOut()} title="Sign out"><div className="user-avatar">{session.user.email?.slice(0, 1).toUpperCase() ?? 'U'}</div><div className="user-meta"><strong>{session.user.email}</strong><span>{isAdmin ? 'Administrator' : 'Batch member'}</span></div><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>University batch</span><span className="crumb-slash">/</span><strong>{navItems.find((item) => item.key === tab)?.label}</strong></div>
          <div className="topbar-actions">
            <div className="sync-status"><span className="sync-dot" />Shared workspace</div>
            {isAdmin && <button className="button button-primary top-add" onClick={() => openEntry('monthly')}><Plus size={16} />Record payment</button>}
            <button className="user-avatar top-avatar" onClick={() => void signOut()} title="Sign out">{session.user.email?.slice(0, 1).toUpperCase() ?? 'U'}</button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="error-banner" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
          {tab === 'overview' && (
            <Overview
              month={month}
              setMonth={setMonth}
              activeMembers={activeMembers}
              entries={entries}
              monthEntries={monthEntries}
              monthlyTotal={monthlyTotal}
              eventTotal={eventTotal}
              monthlyTarget={monthlyTarget}
              progress={progress}
              paidCount={paidCount}
              dueCount={dueCount}
              balance={balance}
              members={members}
              canEdit={isAdmin}
              onRecord={openEntry}
              onNavigate={setTab}
              onDelete={deleteEntry}
            />
          )}
          {tab === 'contributions' && (
            <Contributions
              month={month}
              setMonth={setMonth}
              members={activeMembers}
              entries={monthEntries}
              search={search}
              setSearch={setSearch}
              canEdit={isAdmin}
              onRecord={openEntry}
              onDelete={deleteEntry}
            />
          )}
          {tab === 'members' && (
            <MembersView
              members={members}
              entries={entries}
              month={month}
              search={search}
              setSearch={setSearch}
              canEdit={isAdmin}
              onAdd={() => setModal('member')}
              onToggle={toggleMember}
            />
          )}
          {tab === 'transactions' && (
            <Transactions
              entries={entries}
              members={members}
              filter={transactionFilter}
              setFilter={setTransactionFilter}
              canEdit={isAdmin}
              onAdd={openEntry}
              onDelete={deleteEntry}
            />
          )}
        </div>
        <footer className="page-footer"><span>Batchfund</span><span>Built for your batch, kept in balance.</span><button className="footer-settings" title="Shared, secure workspace"><Settings2 size={15} />Secure workspace</button></footer>
      </main>
      {mobileNavOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {modal === 'member' && <MemberDialog members={members} busy={saving} onClose={() => setModal(null)} onSubmit={addMember} />}
      {modal === 'entry' && <EntryDialog members={activeMembers} defaults={entryDefaults} busy={saving} onClose={() => setModal(null)} onSubmit={recordEntry} />}
    </div>
  )
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div>{action && <div className="heading-action">{action}</div>}</div>
}

function MonthPicker({ month, setMonth }: { month: string; setMonth: (value: string) => void }) {
  return <label className="month-picker"><CalendarDays size={16} /><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Select month" /><ChevronDown size={14} /></label>
}

function Overview({
  month, setMonth, activeMembers, entries, monthEntries, monthlyTotal, eventTotal,
  monthlyTarget, progress, paidCount, dueCount, balance, members, canEdit,
  onRecord, onNavigate, onDelete,
}: {
  month: string
  setMonth: (value: string) => void
  activeMembers: Member[]
  entries: LedgerEntry[]
  monthEntries: LedgerEntry[]
  monthlyTotal: number
  eventTotal: number
  monthlyTarget: number
  progress: number
  paidCount: number
  dueCount: number
  balance: number
  members: Member[]
  canEdit: boolean
  onRecord: (type?: EntryType, memberId?: string | null) => void
  onNavigate: (tab: Tab) => void
  onDelete: (entry: LedgerEntry) => void
}) {
  const expenses = monthEntries.filter((entry) => entry.entry_type === 'expense').reduce((sum, entry) => sum + Number(entry.amount), 0)
  const recent = [...entries].slice(0, 5)
  const progressWidth = Math.max(0, Math.min(100, progress))
  return (
    <>
      <PageHeading eyebrow="YOUR BATCH AT A GLANCE" title="Fund overview" detail="A little goes a long way when everyone chips in." action={<MonthPicker month={month} setMonth={setMonth} />} />
      <section className="stat-grid" aria-label="Fund summary">
        <article className="stat-card balance-card">
          <div className="stat-top"><span className="stat-label">Available balance</span><span className="stat-icon mint-icon"><Wallet size={17} /></span></div>
          <strong className="stat-value">{money.format(balance)}</strong>
          <div className="stat-foot"><span className="balance-indicator"><i /> Live shared balance</span><span className="stat-period">All time</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span className="stat-label">Monthly contributions</span><span className="stat-icon lilac-icon"><Coins size={17} /></span></div>
          <strong className="stat-value">{money.format(monthlyTotal)}</strong>
          <div className="stat-foot"><span>{paidCount} of {activeMembers.length} members paid</span><span className="stat-period">{displayMonth(month)}</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span className="stat-label">Event collections</span><span className="stat-icon peach-icon"><CalendarDays size={17} /></span></div>
          <strong className="stat-value">{money.format(eventTotal)}</strong>
          <div className="stat-foot"><span>Kept separate, included in balance</span><span className="stat-period">{displayMonth(month)}</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span className="stat-label">Active members</span><span className="stat-icon blue-icon"><Users size={17} /></span></div>
          <strong className="stat-value">{activeMembers.length}<small> / 220</small></strong>
          <div className="stat-foot"><span>Registration numbers 1–220</span><span className="stat-period">{dueCount} pending</span></div>
        </article>
      </section>

      <section className="overview-grid">
        <article className="panel collection-panel">
          <div className="panel-heading"><div><span className="eyebrow">MONTHLY COLLECTION</span><h2>{displayMonth(month)}</h2></div><button className="icon-button" aria-label="View contributions" onClick={() => onNavigate('contributions')}><Ellipsis size={20} /></button></div>
          <div className="collection-total"><strong>{money.format(monthlyTotal)}</strong><span>of {money.format(monthlyTarget)} target</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progressWidth}%` }} /></div>
          <div className="progress-meta"><span><i className="legend-dot green-dot" />{paidCount} paid</span><span><i className="legend-dot gray-dot" />{dueCount} pending</span><strong>{progress}%</strong></div>
          {activeMembers.length === 0 ? (
            <div className="empty-inline"><Users size={19} /><span>Add your members to start tracking monthly contributions.</span></div>
          ) : (
            <div className="collection-bottom">
              <div className="avatar-stack">{activeMembers.slice(0, 5).map((member, index) => <span key={member.id} className={`mini-avatar mini-${index % 5}`}>{member.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>)}{activeMembers.length > 5 && <span className="mini-avatar more-avatar">+{activeMembers.length - 5}</span>}</div>
              <button className="text-link" onClick={() => onNavigate('contributions')}>View contributions <ArrowUpRight size={14} /></button>
            </div>
          )}
        </article>
        <article className="panel breakdown-panel">
          <div className="panel-heading"><div><span className="eyebrow">FUND BREAKDOWN</span><h2>Where things stand</h2></div><span className="period-pill">All time</span></div>
          <div className="breakdown-row"><span className="breakdown-symbol income-symbol"><ArrowDownLeft size={15} /></span><span className="breakdown-name">Monthly contributions</span><strong>{money.format(entries.filter((entry) => entry.entry_type === 'monthly').reduce((sum, entry) => sum + Number(entry.amount), 0))}</strong></div>
          <div className="breakdown-row"><span className="breakdown-symbol event-symbol"><CalendarDays size={15} /></span><span className="breakdown-name">Event collections</span><strong>{money.format(entries.filter((entry) => entry.entry_type === 'event').reduce((sum, entry) => sum + Number(entry.amount), 0))}</strong></div>
          <div className="breakdown-row"><span className="breakdown-symbol expense-symbol"><ArrowUpRight size={15} /></span><span className="breakdown-name">Expenses &amp; withdrawals</span><strong className="expense-number">− {money.format(expenses)}</strong></div>
          <div className="breakdown-divider" />
          <div className="breakdown-total"><span>Available balance</span><strong>{money.format(balance)}</strong></div>
        </article>
      </section>

      <section className="panel activity-panel">
        <div className="panel-heading activity-heading"><div><span className="eyebrow">THE LATEST</span><h2>Recent activity</h2></div><button className="text-link" onClick={() => onNavigate('transactions')}>All transactions <ArrowUpRight size={14} /></button></div>
        {recent.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><CircleDollarSign size={23} /></div><strong>No activity just yet</strong><span>Your fund’s first contribution or collection will show up here.</span>{canEdit && <button className="button button-secondary" onClick={() => onRecord('monthly')}><Plus size={15} />Record a contribution</button>}</div>
        ) : (
          <div className="activity-list">
            {recent.map((entry) => (
              <TransactionRow key={entry.id} entry={entry} memberName={displayName(entry, members)} canDelete={canEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function Contributions({
  month, setMonth, members, entries, search, setSearch, canEdit, onRecord, onDelete,
}: {
  month: string
  setMonth: (value: string) => void
  members: Member[]
  entries: LedgerEntry[]
  search: string
  setSearch: (value: string) => void
  canEdit: boolean
  onRecord: (type?: EntryType, memberId?: string | null) => void
  onDelete: (entry: LedgerEntry) => void
}) {
  const paidByMember = new Map(entries.filter((entry) => entry.entry_type === 'monthly' && entry.member_id).map((entry) => [entry.member_id, entry]))
  const filtered = members.filter((member) => (
    member.full_name.toLowerCase().includes(search.toLowerCase())
    || String(member.registration_number).includes(search.trim().replace(/^#/, ''))
  ))
  const paidTotal = entries.filter((entry) => entry.entry_type === 'monthly').reduce((sum, entry) => sum + Number(entry.amount), 0)
  const paidCount = paidByMember.size
  const dueCount = Math.max(0, members.length - paidCount)
  return (
    <>
      <PageHeading eyebrow="MONTH BY MONTH" title="Contributions" detail="See who has chipped in and what’s still pending." action={<MonthPicker month={month} setMonth={setMonth} />} />
      <section className="contribution-summary">
        <div><span>Collected this month</span><strong>{money.format(paidTotal)}</strong></div>
        <div><span>Members paid</span><strong>{paidCount}<small> / {members.length}</small></strong></div>
        <div><span>Still pending</span><strong className={dueCount ? 'pending-number' : ''}>{dueCount}</strong></div>
        <div className="contribution-target"><span>Standard contribution</span><strong>{money.format(MONTHLY_CONTRIBUTION)} <small>/ month</small></strong></div>
      </section>
      <section className="panel data-panel">
        <div className="table-toolbar"><div><h2>Member payments</h2><span>{displayMonth(month)}</span></div><div className="toolbar-actions"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a member" /></label><button className="icon-button download-button" title="Download contributions as CSV" onClick={() => downloadCsv(`contributions-${month}.csv`, ['Registration', 'Member', 'Status', 'Amount LKR'], members.map((member) => { const entry = paidByMember.get(member.id); return [member.registration_number, member.full_name, entry ? 'Paid' : 'Pending', entry?.amount ?? ''] }))}><Download size={17} /></button></div></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>MEMBER</th><th>REG. NO.</th><th>AMOUNT</th><th>STATUS</th><th>DATE PAID</th>{canEdit && <th />}</tr></thead><tbody>
          {filtered.map((member) => {
            const entry = paidByMember.get(member.id)
            return <tr key={member.id}><td><MemberCell member={member} /></td><td><span className="registration-tag">#{member.registration_number}</span></td><td>{entry ? money.format(Number(entry.amount)) : <span className="muted-cell">—</span>}</td><td><span className={`status-pill ${entry ? 'status-paid' : 'status-pending'}`}><i />{entry ? 'Paid' : 'Pending'}</span></td><td>{entry ? shortDate.format(new Date(`${entry.entry_date}T00:00:00`)) : <span className="muted-cell">—</span>}</td>{canEdit && <td className="table-action-cell">{entry ? <button className="small-action remove-payment" onClick={() => onDelete(entry)} title="Remove payment record"><X size={14} /></button> : <button className="small-action" onClick={() => onRecord('monthly', member.id)}><Plus size={14} />Record</button>}</td>}</tr>
          })}
          {filtered.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} className="table-empty">{members.length ? 'No members match your search.' : 'No active members yet. Add members to begin tracking.'}</td></tr>}
        </tbody></table></div>
        <div className="table-footer"><span>Showing {filtered.length} of {members.length} active members</span><span>{dueCount === 0 && members.length ? <><Check size={14} /> All caught up</> : `${dueCount} ${dueCount === 1 ? 'payment' : 'payments'} pending`}</span></div>
      </section>
    </>
  )
}

function MembersView({
  members, entries, month, search, setSearch, canEdit, onAdd, onToggle,
}: {
  members: Member[]
  entries: LedgerEntry[]
  month: string
  search: string
  setSearch: (value: string) => void
  canEdit: boolean
  onAdd: () => void
  onToggle: (member: Member) => void
}) {
  const active = members.filter((member) => member.is_active)
  const archived = members.filter((member) => !member.is_active)
  const [showArchived, setShowArchived] = useState(false)
  const visible = (showArchived ? members : active).filter((member) => (
    member.full_name.toLowerCase().includes(search.toLowerCase())
    || String(member.registration_number).includes(search.trim().replace(/^#/, ''))
  ))
  const paid = new Set(entries.filter((entry) => entry.entry_type === 'monthly' && entry.period_month?.startsWith(month)).map((entry) => entry.member_id))
  const assignedNumbers = new Set(members.map((member) => member.registration_number))
  const remainingSlots = 220 - assignedNumbers.size
  return (
    <>
      <PageHeading eyebrow="YOUR PEOPLE" title="Members" detail="Keep the batch list in order, registration number by number." action={canEdit ? <button className="button button-primary" onClick={onAdd} disabled={remainingSlots <= 0}><Plus size={16} />Add member</button> : undefined} />
      <section className="member-stats">
        <div className="member-stat-card"><span className="member-stat-icon blue-icon"><Users size={18} /></span><div><span>Active members</span><strong>{active.length}</strong></div></div>
        <div className="member-stat-card"><span className="member-stat-icon lilac-icon"><BadgeCheck size={18} /></span><div><span>Paid in {displayMonth(month)}</span><strong>{paid.size}</strong></div></div>
        <div className="member-stat-card"><span className="member-stat-icon peach-icon"><Settings2 size={18} /></span><div><span>Registration slots left</span><strong>{remainingSlots}</strong></div></div>
      </section>
      <section className="panel data-panel">
        <div className="table-toolbar"><div><h2>Batch directory</h2><span>Registration numbers 1–220</span></div><div className="toolbar-actions"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or reg. no." /></label><button className={`filter-toggle ${showArchived ? 'filter-active' : ''}`} onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'All members' : 'Active only'}<ChevronDown size={14} /></button></div></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>MEMBER</th><th>REG. NO.</th><th>THIS MONTH</th><th>JOINED</th>{canEdit && <th />}</tr></thead><tbody>
          {visible.map((member) => <tr key={member.id}><td><MemberCell member={member} /></td><td><span className="registration-tag">#{member.registration_number}</span></td><td>{!member.is_active ? <span className="status-pill status-archived">Archived</span> : <span className={`status-pill ${paid.has(member.id) ? 'status-paid' : 'status-pending'}`}><i />{paid.has(member.id) ? 'Paid' : 'Pending'}</span>}</td><td>{longDate.format(new Date(member.created_at))}</td>{canEdit && <td className="table-action-cell"><button className={`text-button ${member.is_active ? 'archive-action' : ''}`} onClick={() => onToggle(member)}>{member.is_active ? 'Archive' : 'Restore'}</button></td>}</tr>)}
          {visible.length === 0 && <tr><td colSpan={canEdit ? 5 : 4} className="table-empty">{search ? 'No members match your search.' : showArchived && archived.length === 0 ? 'There are no archived members.' : 'No members have been added yet.'}</td></tr>}
        </tbody></table></div>
        <div className="table-footer"><span>{active.length} active · {archived.length} archived</span><span>Admin-managed directory</span></div>
      </section>
    </>
  )
}

function Transactions({
  entries, members, filter, setFilter, canEdit, onAdd, onDelete,
}: {
  entries: LedgerEntry[]
  members: Member[]
  filter: TransactionFilter
  setFilter: (filter: TransactionFilter) => void
  canEdit: boolean
  onAdd: (type?: EntryType, memberId?: string | null) => void
  onDelete: (entry: LedgerEntry) => void
}) {
  const visible = entries.filter((entry) => filter === 'all' || entry.entry_type === filter)
  return (
    <>
      <PageHeading eyebrow="EVERY RUPEE, ACCOUNTED FOR" title="Transactions" detail="Monthly contributions, event collections and expenses in one ledger." action={canEdit ? <button className="button button-primary" onClick={() => onAdd('event')}><Plus size={16} />Add transaction</button> : undefined} />
      <section className="transaction-totals">
        <div><span>Monthly fund</span><strong>{money.format(entries.filter((entry) => entry.entry_type === 'monthly').reduce((sum, entry) => sum + Number(entry.amount), 0))}</strong><small>Contributions</small></div>
        <div><span>Event collections</span><strong>{money.format(entries.filter((entry) => entry.entry_type === 'event').reduce((sum, entry) => sum + Number(entry.amount), 0))}</strong><small>Separate category</small></div>
        <div><span>Expenses</span><strong className="expense-number">{money.format(entries.filter((entry) => entry.entry_type === 'expense').reduce((sum, entry) => sum + Number(entry.amount), 0))}</strong><small>Withdrawals &amp; spending</small></div>
      </section>
      <section className="panel data-panel transaction-table-panel">
        <div className="table-toolbar"><div><h2>All transactions</h2><span>{visible.length} records · newest first</span></div><div className="filter-tabs" role="group" aria-label="Filter transactions">{(['all', 'event', 'expense'] as const).map((option) => <button key={option} className={filter === option ? 'filter-tab-active' : ''} onClick={() => setFilter(option)}>{option === 'all' ? 'All' : option === 'event' ? 'Events' : 'Expenses'}</button>)}</div></div>
        <div className="activity-list transaction-activity">
          {visible.map((entry) => <TransactionRow key={entry.id} entry={entry} memberName={displayName(entry, members)} canDelete={canEdit} onDelete={onDelete} />)}
          {visible.length === 0 && <div className="table-empty transaction-empty">No transactions here yet.</div>}
        </div>
      </section>
      <div className="ledger-note"><ShieldCheck size={16} /><span>Event collections are listed separately and included in the available balance.</span></div>
    </>
  )
}

function MemberCell({ member }: { member: Member }) {
  const initials = member.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <div className="member-cell"><span className={`member-avatar avatar-${member.registration_number % 5}`}>{initials}</span><span><strong>{member.full_name}</strong><small>{member.is_active ? 'Batch member' : 'Archived member'}</small></span></div>
}

function TransactionRow({
  entry, memberName, canDelete, onDelete,
}: {
  entry: LedgerEntry
  memberName: string | null
  canDelete: boolean
  onDelete: (entry: LedgerEntry) => void
}) {
  const isExpense = entry.entry_type === 'expense'
  const label = entry.entry_type === 'monthly' ? 'Monthly contribution' : entry.entry_type === 'event' ? entry.event_name || 'Event collection' : entry.event_name || 'Expense'
  const detail = entry.entry_type === 'monthly' ? memberName || 'Batch member' : [memberName, entry.notes].filter(Boolean).join(' · ') || (entry.entry_type === 'event' ? 'Batch event' : 'Fund expense')
  return (
    <div className="activity-row">
      <span className={`activity-icon ${entry.entry_type === 'monthly' ? 'activity-income' : isExpense ? 'activity-expense' : 'activity-event'}`}>{entry.entry_type === 'monthly' ? <Coins size={17} /> : isExpense ? <ArrowUpRight size={17} /> : <CalendarDays size={17} />}</span>
      <div className="activity-description"><strong>{label}</strong><span>{detail}</span></div>
      <span className="activity-date"><Clock3 size={13} />{shortDate.format(new Date(`${entry.entry_date}T00:00:00`))}</span>
      <strong className={`activity-amount ${isExpense ? 'expense-number' : ''}`}>{isExpense ? '− ' : '+ '}{money.format(Number(entry.amount))}</strong>
      {canDelete && <button className="small-action remove-payment activity-delete" title="Delete transaction" onClick={() => onDelete(entry)}><X size={14} /></button>}
    </div>
  )
}

function MemberDialog({
  members, busy, onClose, onSubmit,
}: {
  members: Member[]
  busy: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const taken = new Set(members.map((member) => member.registration_number))
  const available = Array.from({ length: 220 }, (_, index) => index + 1).filter((number) => !taken.has(number))
  return (
    <Dialog title="Add a batch member" subtitle="Give each person a unique registration number." onClose={onClose}>
      <form className="dialog-form" onSubmit={onSubmit}>
        <label>Member’s full name<input name="full_name" placeholder="e.g. Nethmi Perera" autoFocus required maxLength={100} /></label>
        <label>Registration number<select name="registration_number" required defaultValue=""><option value="" disabled>Select a number (1–220)</option>{available.map((number) => <option key={number} value={number}>#{number}</option>)}</select></label>
        <p className="field-note">Registration numbers already assigned to archived members stay reserved, so past fund records remain connected.</p>
        <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy || available.length === 0}>{busy ? 'Saving…' : <><Plus size={15} />Add member</>}</button></div>
      </form>
    </Dialog>
  )
}

function EntryDialog({
  members, defaults, busy, onClose, onSubmit,
}: {
  members: Member[]
  defaults: Partial<EntryDraft>
  busy: boolean
  onClose: () => void
  onSubmit: (draft: EntryDraft) => Promise<void>
}) {
  const [type, setType] = useState<EntryType>(defaults.entry_type ?? 'monthly')
  const [memberId, setMemberId] = useState(defaults.member_id ?? '')
  const [amount, setAmount] = useState(String(defaults.amount ?? 0))
  const [month, setMonth] = useState((defaults.period_month ?? `${currentMonth()}-01`).slice(0, 7))
  const [entryDate, setEntryDate] = useState(defaults.entry_date ?? today())
  const [eventName, setEventName] = useState('')
  const [notes, setNotes] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return
    await onSubmit({
      entry_type: type,
      amount: numericAmount,
      member_id: type === 'monthly' ? memberId : memberId || null,
      period_month: type === 'monthly' ? `${month}-01` : null,
      event_name: type === 'monthly' ? null : eventName.trim() || null,
      notes: notes.trim() || null,
      entry_date: entryDate,
    })
  }

  return (
    <Dialog title={type === 'monthly' ? 'Record a contribution' : type === 'event' ? 'Add an event collection' : 'Record an expense'} subtitle="This update will be shared with everyone in the workspace." onClose={onClose}>
      <form className="dialog-form" onSubmit={submit}>
        <label>Record type<select value={type} onChange={(event) => setType(event.target.value as EntryType)}><option value="monthly">Monthly contribution</option><option value="event">Event collection</option><option value="expense">Expense / withdrawal</option></select></label>
        {type === 'monthly' && <label>Member<select value={memberId} onChange={(event) => setMemberId(event.target.value)} required><option value="">Select a member</option>{members.map((member) => <option key={member.id} value={member.id}>#{member.registration_number} · {member.full_name}</option>)}</select></label>}
        {type !== 'monthly' && <label>Member <span className="optional-label">optional</span><select value={memberId} onChange={(event) => setMemberId(event.target.value)}><option value="">No specific member</option>{members.map((member) => <option key={member.id} value={member.id}>#{member.registration_number} · {member.full_name}</option>)}</select></label>}
        {type !== 'monthly' && <label>{type === 'event' ? 'Event name' : 'Expense description'}<input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder={type === 'event' ? 'e.g. Batch trip' : 'e.g. Venue deposit'} required maxLength={120} /></label>}
        <div className="form-two-col">
          <label>Amount (LKR)<input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
          {type === 'monthly' ? <label>Contribution month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required /></label> : <label>Date<input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required /></label>}
        </div>
        {type !== 'monthly' && <label>Note <span className="optional-label">optional</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a little context…" maxLength={500} /></label>}
        {type === 'monthly' && <p className="field-note">Standard contribution is LKR {MONTHLY_CONTRIBUTION.toLocaleString('en-LK')}. Adjust the amount if needed.</p>}
        <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving…' : <><Check size={15} />Save record</>}</button></div>
      </form>
    </Dialog>
  )
}

function Dialog({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading"><div><span className="eyebrow">BATCH FUND</span><h2 id="dialog-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
        {children}
      </section>
    </div>
  )
}

function downloadCsv(filename: string, headers: (string | number)[], rows: (string | number)[][]) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const content = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default App
