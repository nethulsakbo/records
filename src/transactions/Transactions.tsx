import { ArrowUpRight, CalendarDays, Check, Clock3, Coins, Download, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { EntryType } from '../lib/database.types'
import type { Member, LedgerEntry, EntryDraft, TransactionFilter } from '../lib/types'
import { MONTHLY_CONTRIBUTION, money, shortDate, currentMonth, today, displayMonth, displayName, downloadCsv } from '../lib/formatters'
import { Dialog } from '../components/Dialog'
import { MemberCell } from '../members/MembersView'
import { MonthPicker, PageHeading } from '../components/PageHeading'

export function Contributions({
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

export function Transactions({
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

export function TransactionRow({
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

export function EntryDialog({
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
