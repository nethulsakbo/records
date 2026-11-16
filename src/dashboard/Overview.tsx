import { AlertCircle, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Coins, Ellipsis, Plus, ShieldCheck, UserCheck, Users, Wallet } from 'lucide-react'
import type { EntryType } from '../lib/database.types'
import type { Member, LedgerEntry, FundOverviewSummary, Tab, UserProfile } from '../lib/types'
import { MONTHLY_CONTRIBUTION, money, displayMonth, displayName, shortDate } from '../lib/formatters'
import { TransactionRow } from '../transactions/Transactions'
import { MonthPicker, PageHeading } from '../components/PageHeading'

export function Overview({
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

      {dueCount > 0 && (
        <div className="admin-unpaid-banner">
          <div className="unpaid-banner-left">
            <span className="unpaid-icon-wrap"><AlertCircle size={18} /></span>
            <div>
              <strong>{dueCount} {dueCount === 1 ? 'member has' : 'members have'} not paid for {displayMonth(month)}</strong>
              <span>Only administrators can view unpaid member records.</span>
            </div>
          </div>
          <button className="button button-secondary unpaid-banner-btn" onClick={() => onNavigate('contributions')}>
            View unpaid list <ArrowRight size={14} />
          </button>
        </div>
      )}

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

export function ViewerOverview({
  summary,
  month,
  setMonth,
  profile,
  member,
  ownEntries,
  onNavigate,
}: {
  summary: FundOverviewSummary
  month: string
  setMonth: (value: string) => void
  profile: UserProfile
  member: Member | null
  ownEntries: LedgerEntry[]
  onNavigate?: (tab: Tab) => void
}) {
  // Check user's own payment status for the selected month
  const thisMonthPayment = ownEntries.find((e) =>
    e.entry_type === 'monthly' && e.period_month?.startsWith(month)
  )
  const isPaidThisMonth = Boolean(thisMonthPayment)
  const totalUserContributed = ownEntries
    .filter((e) => e.entry_type === 'monthly')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const monthsPaidCount = ownEntries.filter((e) => e.entry_type === 'monthly').length

  const memberName = member?.full_name || profile.email.split('@')[0]
  const regNumber = profile.registration_number ?? member?.registration_number

  return (
    <>
      <PageHeading
        eyebrow="BATCH MEMBER DASHBOARD"
        title={`Hello, ${memberName}`}
        detail="Your personal monthly contribution status and batch fund records."
        action={<MonthPicker month={month} setMonth={setMonth} />}
      />

      {/* Hero Personal Payment Status Card */}
      <section className={`personal-status-card ${isPaidThisMonth ? 'status-card-paid' : 'status-card-pending'}`}>
        <div className="status-card-main">
          <div className="status-icon-wrap">
            {isPaidThisMonth ? <CheckCircle2 size={32} /> : <Clock3 size={32} />}
          </div>
          <div className="status-copy">
            <span className="status-period-tag">{displayMonth(month)} Status</span>
            <h2>{isPaidThisMonth ? 'Payment Complete' : 'Payment Pending'}</h2>
            <p>
              {isPaidThisMonth ? (
                <>
                  Your monthly contribution of <strong>{money.format(Number(thisMonthPayment?.amount ?? MONTHLY_CONTRIBUTION))}</strong> was recorded on {thisMonthPayment?.entry_date ? shortDate.format(new Date(`${thisMonthPayment.entry_date}T00:00:00`)) : 'record'}.
                  {thisMonthPayment?.notes ? ` Note: "${thisMonthPayment.notes}"` : ''}
                </>
              ) : (
                <>
                  Your standard contribution of <strong>{money.format(MONTHLY_CONTRIBUTION)}</strong> for {displayMonth(month)} is pending. Please hand it in to a batch fund administrator.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="status-card-meta">
          <div className="meta-item">
            <span>Roster</span>
            <strong>{regNumber ? `#${regNumber}` : 'Unassigned'}</strong>
          </div>
          <div className="meta-item">
            <span>Status</span>
            <span className={`status-pill ${isPaidThisMonth ? 'status-paid' : 'status-pending'}`}>
              <i /> {isPaidThisMonth ? 'Paid' : 'Pending'}
            </span>
          </div>
        </div>
      </section>

      {/* Personal Stats Grid */}
      <section className="stat-grid" aria-label="Personal contribution summary">
        <article className="stat-card balance-card">
          <div className="stat-top">
            <span className="stat-label">Batch fund balance</span>
            <span className="stat-icon mint-icon"><Wallet size={17} /></span>
          </div>
          <strong className="stat-value">{money.format(summary.balance)}</strong>
          <div className="stat-foot">
            <span className="balance-indicator"><i /> Shared batch balance</span>
            <span className="stat-period">All time</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">My total contributions</span>
            <span className="stat-icon lilac-icon"><Coins size={17} /></span>
          </div>
          <strong className="stat-value">{money.format(totalUserContributed)}</strong>
          <div className="stat-foot">
            <span>Lifetime personal payments</span>
            <span className="stat-period">My record</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Months contributed</span>
            <span className="stat-icon peach-icon"><CalendarDays size={17} /></span>
          </div>
          <strong className="stat-value">{monthsPaidCount} <small>months</small></strong>
          <div className="stat-foot">
            <span>Recorded monthly payments</span>
            <span className="stat-period">History</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">My roster number</span>
            <span className="stat-icon blue-icon"><UserCheck size={17} /></span>
          </div>
          <strong className="stat-value">{regNumber ? `#${regNumber}` : '—'}</strong>
          <div className="stat-foot">
            <span>{member?.full_name ?? 'Batch member'}</span>
            <span className="stat-period">Directory</span>
          </div>
        </article>
      </section>

      {/* Personal Monthly Payment History Panel */}
      <section className="panel data-panel personal-history-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">MY PAYMENT RECORDS</span>
            <h2>Monthly contribution history</h2>
          </div>
          <span className="period-pill">{ownEntries.length} records</span>
        </div>

        {ownEntries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Coins size={24} /></div>
            <strong>No payments recorded yet</strong>
            <span>Your payments will show up here once recorded by a batch administrator.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CONTRIBUTION MONTH</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>DATE RECORDED</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {ownEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.period_month ? displayMonth(entry.period_month.slice(0, 7)) : 'Monthly'}</strong>
                    </td>
                    <td>{money.format(Number(entry.amount))}</td>
                    <td>
                      <span className="status-pill status-paid"><i /> Paid</span>
                    </td>
                    <td>{entry.entry_date ? shortDate.format(new Date(`${entry.entry_date}T00:00:00`)) : '—'}</td>
                    <td>{entry.notes || <span className="muted-cell">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Shared Batch Transparency Section */}
      <section className="overview-grid">
        <article className="panel breakdown-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FUND TRANSPARENCY</span>
              <h2>Where the batch fund stands</h2>
            </div>
            <span className="period-pill">All time</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-symbol income-symbol"><ArrowDownLeft size={15} /></span>
            <span className="breakdown-name">Total monthly contributions</span>
            <strong>{money.format(summary.total_contributions)}</strong>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-symbol event-symbol"><CalendarDays size={15} /></span>
            <span className="breakdown-name">Total event collections</span>
            <strong>{money.format(summary.total_events)}</strong>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-symbol expense-symbol"><ArrowUpRight size={15} /></span>
            <span className="breakdown-name">Total batch expenses</span>
            <strong className="expense-number">− {money.format(summary.total_expenses)}</strong>
          </div>
          <div className="breakdown-divider" />
          <div className="breakdown-total">
            <span>Available live balance</span>
            <strong>{money.format(summary.balance)}</strong>
          </div>
          {onNavigate && (
            <div className="breakdown-footer-action">
              <button className="button button-secondary w-full" onClick={() => onNavigate('events')}>
                <CalendarDays size={15} /> View batch events &amp; expenses breakdown
              </button>
            </div>
          )}
        </article>

        <article className="panel collection-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MONTHLY TARGET</span>
              <h2>{displayMonth(month)} overview</h2>
            </div>
          </div>
          <div className="collection-total">
            <strong>{money.format(summary.monthly_total)}</strong>
            <span>collected this month</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${summary.active_members ? Math.min(100, Math.round((summary.monthly_paid_members / summary.active_members) * 100)) : 0}%`,
              }}
            />
          </div>
          <div className="progress-meta">
            <span><i className="legend-dot green-dot" />{summary.monthly_paid_members} contributions</span>
            <strong>{summary.active_members ? Math.round((summary.monthly_paid_members / summary.active_members) * 100) : 0}%</strong>
          </div>
          <div className="member-privacy-note">
            <ShieldCheck size={16} />
            <span>Member individual payment statuses are private and only visible to authorized fund administrators.</span>
          </div>
        </article>
      </section>
    </>
  )
}

