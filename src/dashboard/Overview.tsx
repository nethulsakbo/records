import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleDollarSign, Coins, Ellipsis, Plus, Users, Wallet } from 'lucide-react'
import type { EntryType } from '../lib/database.types'
import type { Member, LedgerEntry, FundOverviewSummary, Tab } from '../lib/types'
import { MONTHLY_CONTRIBUTION, money, displayMonth, displayName } from '../lib/formatters'
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
}: {
  summary: FundOverviewSummary
  month: string
  setMonth: (value: string) => void
}) {
  const monthlyTarget = summary.active_members * MONTHLY_CONTRIBUTION
  const progress = monthlyTarget
    ? Math.min(100, Math.round((summary.monthly_total / monthlyTarget) * 100))
    : 0

  return (
    <>
      <PageHeading
        eyebrow="YOUR BATCH AT A GLANCE"
        title="Fund overview"
        detail="View shared fund totals and basic batch status."
        action={<MonthPicker month={month} setMonth={setMonth} />}
      />
      <section className="stat-grid" aria-label="Fund summary">
        <article className="stat-card balance-card">
          <div className="stat-top"><span className="stat-label">Available balance</span><span className="stat-icon mint-icon"><Wallet size={17} /></span></div>
          <strong className="stat-value">{money.format(summary.balance)}</strong>
          <div className="stat-foot"><span className="balance-indicator"><i /> Live shared balance</span><span className="stat-period">All time</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span className="stat-label">Monthly contributions</span><span className="stat-icon lilac-icon"><Coins size={17} /></span></div>
          <strong className="stat-value">{money.format(summary.monthly_total)}</strong>
          <div className="stat-foot"><span>{summary.monthly_paid_members} contributions this month</span><span className="stat-period">{displayMonth(month)}</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span className="stat-label">Event collections</span><span className="stat-icon peach-icon"><CalendarDays size={17} /></span></div>
          <strong className="stat-value">{money.format(summary.event_total)}</strong>
          <div className="stat-foot"><span>Included in available balance</span><span className="stat-period">{displayMonth(month)}</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span className="stat-label">Active members</span><span className="stat-icon blue-icon"><Users size={17} /></span></div>
          <strong className="stat-value">{summary.active_members}<small> / 220</small></strong>
          <div className="stat-foot"><span>Registration numbers 1–220</span><span className="stat-period">Batch total</span></div>
        </article>
      </section>
      <section className="overview-grid">
        <article className="panel collection-panel">
          <div className="panel-heading"><div><span className="eyebrow">MONTHLY COLLECTION</span><h2>{displayMonth(month)}</h2></div></div>
          <div className="collection-total"><strong>{money.format(summary.monthly_total)}</strong><span>of {money.format(monthlyTarget)} target</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="progress-meta"><span><i className="legend-dot green-dot" />{summary.monthly_paid_members} contributions</span><span><i className="legend-dot gray-dot" />{Math.max(0, summary.active_members - summary.monthly_paid_members)} remaining</span><strong>{progress}%</strong></div>
        </article>
        <article className="panel breakdown-panel">
          <div className="panel-heading"><div><span className="eyebrow">FUND BREAKDOWN</span><h2>Where things stand</h2></div><span className="period-pill">All time</span></div>
          <div className="breakdown-row"><span className="breakdown-symbol income-symbol"><ArrowDownLeft size={15} /></span><span className="breakdown-name">Monthly contributions</span><strong>{money.format(summary.total_contributions)}</strong></div>
          <div className="breakdown-row"><span className="breakdown-symbol event-symbol"><CalendarDays size={15} /></span><span className="breakdown-name">Event collections</span><strong>{money.format(summary.total_events)}</strong></div>
          <div className="breakdown-row"><span className="breakdown-symbol expense-symbol"><ArrowUpRight size={15} /></span><span className="breakdown-name">Expenses &amp; withdrawals</span><strong className="expense-number">− {money.format(summary.total_expenses)}</strong></div>
          <div className="breakdown-divider" />
          <div className="breakdown-total"><span>Available balance</span><strong>{money.format(summary.balance)}</strong></div>
        </article>
      </section>
    </>
  )
}
