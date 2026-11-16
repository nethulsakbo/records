import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, Coins, Edit3, Plus, Search, Trash2, Wallet, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { BatchEvent, EventDraft, LedgerEntry, Member } from '../lib/types'
import { money, shortDate, today } from '../lib/formatters'
import { Dialog } from '../components/Dialog'
import { PageHeading } from '../components/PageHeading'

export function EventsView({
  events,
  entries,
  members,
  canEdit,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onRecordEntry,
  onDeleteEntry,
}: {
  events: BatchEvent[]
  entries: LedgerEntry[]
  members: Member[]
  canEdit: boolean
  onAddEvent: (draft: EventDraft) => Promise<void>
  onEditEvent: (eventId: string, draft: Partial<EventDraft>) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
  onRecordEntry: (draft: {
    entry_type: 'event' | 'expense'
    amount: number
    member_id: string | null
    event_id: string
    event_name: string
    notes: string | null
    entry_date: string
  }) => Promise<void>
  onDeleteEntry: (entry: LedgerEntry) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | 'record_collection' | 'record_expense' | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<BatchEvent | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredEvents = events.filter((ev) =>
    ev.title.toLowerCase().includes(search.toLowerCase()) ||
    (ev.description && ev.description.toLowerCase().includes(search.toLowerCase())),
  )

  // Overall event stats
  const eventEntries = entries.filter((e) => e.entry_type === 'event' || e.entry_type === 'expense')
  const totalCollections = eventEntries
    .filter((e) => e.entry_type === 'event')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const totalExpenses = eventEntries
    .filter((e) => e.entry_type === 'expense')
    .reduce((sum, e) => sum + Number(e.amount), 0)
  const netBalance = totalCollections - totalExpenses

  function openRecordModal(type: 'record_collection' | 'record_expense', ev: BatchEvent) {
    setSelectedEvent(ev)
    setModal(type)
  }

  function openEditModal(ev: BatchEvent) {
    setSelectedEvent(ev)
    setModal('edit')
  }

  return (
    <>
      <PageHeading
        eyebrow="BATCH OCCASIONS"
        title="Events & Collections"
        detail="Track special events, specific collections, and all associated expenses with full transparency."
        action={
          canEdit ? (
            <button className="button button-primary" onClick={() => setModal('create')}>
              <Plus size={16} />
              New event
            </button>
          ) : undefined
        }
      />

      <section className="stat-grid" aria-label="Events financial summary">
        <article className="stat-card balance-card">
          <div className="stat-top">
            <span className="stat-label">Event net balance</span>
            <span className="stat-icon mint-icon"><Wallet size={17} /></span>
          </div>
          <strong className="stat-value">{money.format(netBalance)}</strong>
          <div className="stat-foot">
            <span className="balance-indicator"><i /> Collections minus expenses</span>
            <span className="stat-period">All events</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total collections</span>
            <span className="stat-icon lilac-icon"><Coins size={17} /></span>
          </div>
          <strong className="stat-value">{money.format(totalCollections)}</strong>
          <div className="stat-foot">
            <span>Collected for all events</span>
            <span className="stat-period">Inflow</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total expenses</span>
            <span className="stat-icon peach-icon"><ArrowUpRight size={17} /></span>
          </div>
          <strong className="stat-value expense-number">{money.format(totalExpenses)}</strong>
          <div className="stat-foot">
            <span>Spent on event activities</span>
            <span className="stat-period">Outflow</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Tracked events</span>
            <span className="stat-icon blue-icon"><CalendarDays size={17} /></span>
          </div>
          <strong className="stat-value">{events.length}</strong>
          <div className="stat-foot">
            <span>Active &amp; past events</span>
            <span className="stat-period">Batch records</span>
          </div>
        </article>
      </section>

      <section className="panel data-panel events-panel">
        <div className="table-toolbar">
          <div>
            <h2>All events</h2>
            <span>{filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} recorded</span>
          </div>
          <div className="toolbar-actions">
            <label className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events…"
              />
            </label>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CalendarDays size={26} /></div>
            <strong>{search ? 'No events match your search.' : 'No events added yet.'}</strong>
            <span>{canEdit ? 'Add your first batch event to record collections and expenses.' : 'Event details will appear here once created by an admin.'}</span>
            {canEdit && (
              <button className="button button-secondary" onClick={() => setModal('create')}>
                <Plus size={15} />
                Create event
              </button>
            )}
          </div>
        ) : (
          <div className="events-card-grid">
            {filteredEvents.map((ev) => {
              const evEntries = entries.filter((e) =>
                (e.event_id && e.event_id === ev.id) ||
                (e.event_name && e.event_name.toLowerCase() === ev.title.toLowerCase())
              )
              const evCollections = evEntries
                .filter((e) => e.entry_type === 'event')
                .reduce((sum, e) => sum + Number(e.amount), 0)
              const evExpenses = evEntries
                .filter((e) => e.entry_type === 'expense')
                .reduce((sum, e) => sum + Number(e.amount), 0)
              const evBalance = evCollections - evExpenses
              const target = Number(ev.target_amount) || 0
              const progress = target > 0 ? Math.min(100, Math.round((evCollections / target) * 100)) : 0
              const isExpanded = expandedEventId === ev.id

              return (
                <article key={ev.id} className="event-card">
                  <div className="event-card-header">
                    <div className="event-title-wrap">
                      <span className="event-badge"><CalendarDays size={13} /> {ev.event_date ? shortDate.format(new Date(`${ev.event_date}T00:00:00`)) : 'Date TBD'}</span>
                      <h3>{ev.title}</h3>
                      {ev.description && <p className="event-desc">{ev.description}</p>}
                    </div>
                    {canEdit && (
                      <div className="event-admin-actions">
                        <button
                          className="icon-button"
                          title="Edit event details"
                          onClick={() => openEditModal(ev)}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="icon-button icon-button-danger"
                          title="Delete event"
                          onClick={() => {
                            if (window.confirm(`Delete event "${ev.title}"? Associated ledger entries will remain in the transaction log.`)) {
                              void onDeleteEvent(ev.id)
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {target > 0 && (
                    <div className="event-target-progress">
                      <div className="event-progress-top">
                        <span>Target: {money.format(target)}</span>
                        <strong>{progress}%</strong>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="event-metrics-row">
                    <div className="event-metric">
                      <span className="metric-label"><ArrowDownLeft size={13} /> Collected</span>
                      <strong className="metric-val">{money.format(evCollections)}</strong>
                    </div>
                    <div className="event-metric">
                      <span className="metric-label"><ArrowUpRight size={13} /> Expenses</span>
                      <strong className="metric-val expense-number">− {money.format(evExpenses)}</strong>
                    </div>
                    <div className="event-metric event-net">
                      <span className="metric-label"><Wallet size={13} /> Net</span>
                      <strong className={`metric-val ${evBalance >= 0 ? 'profit-number' : 'expense-number'}`}>
                        {money.format(evBalance)}
                      </strong>
                    </div>
                  </div>

                  <div className="event-card-actions">
                    <button
                      className="button button-secondary event-details-toggle"
                      onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                    >
                      {isExpanded ? 'Hide breakdown' : `View breakdown (${evEntries.length})`}
                    </button>
                    {canEdit && (
                      <div className="event-quick-add">
                        <button
                          className="small-action add-coll-btn"
                          onClick={() => openRecordModal('record_collection', ev)}
                          title="Record collection for this event"
                        >
                          <Plus size={13} /> Collection
                        </button>
                        <button
                          className="small-action add-exp-btn"
                          onClick={() => openRecordModal('record_expense', ev)}
                          title="Record expense for this event"
                        >
                          <Plus size={13} /> Expense
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="event-breakdown-details">
                      <div className="breakdown-subhead">
                        <h4>Collections &amp; Expenses</h4>
                        <span>{evEntries.length} items recorded</span>
                      </div>
                      {evEntries.length === 0 ? (
                        <p className="no-items-text">No collections or expenses recorded for this event yet.</p>
                      ) : (
                        <ul className="event-item-list">
                          {evEntries.map((item) => {
                            const isExpense = item.entry_type === 'expense'
                            const memberName = item.member_id ? members.find((m) => m.id === item.member_id)?.full_name : null
                            return (
                              <li key={item.id} className="event-item-row">
                                <span className={`item-chip ${isExpense ? 'item-expense' : 'item-collection'}`}>
                                  {isExpense ? 'Expense' : 'Collection'}
                                </span>
                                <div className="item-info">
                                  <strong>{item.notes || (isExpense ? 'Event expense' : 'Event contribution')}</strong>
                                  <small>
                                    {shortDate.format(new Date(`${item.entry_date}T00:00:00`))}
                                    {memberName ? ` · ${memberName}` : ''}
                                  </small>
                                </div>
                                <span className={`item-amount ${isExpense ? 'expense-number' : 'profit-number'}`}>
                                  {isExpense ? '− ' : '+ '}
                                  {money.format(Number(item.amount))}
                                </span>
                                {canEdit && (
                                  <button
                                    className="small-action remove-payment"
                                    title="Delete item"
                                    onClick={() => void onDeleteEntry(item)}
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modal === 'create' && (
        <EventDialog
          title="Create a new event"
          subtitle="Add a batch event to track collections and expenses."
          busy={saving}
          onClose={() => setModal(null)}
          onSubmit={async (draft) => {
            setSaving(true)
            await onAddEvent(draft)
            setSaving(false)
            setModal(null)
          }}
        />
      )}

      {modal === 'edit' && selectedEvent && (
        <EventDialog
          title="Edit event"
          subtitle="Update event details."
          initial={selectedEvent}
          busy={saving}
          onClose={() => { setModal(null); setSelectedEvent(null) }}
          onSubmit={async (draft) => {
            setSaving(true)
            await onEditEvent(selectedEvent.id, draft)
            setSaving(false)
            setModal(null)
            setSelectedEvent(null)
          }}
        />
      )}

      {modal === 'record_collection' && selectedEvent && (
        <EventTransactionDialog
          type="event"
          event={selectedEvent}
          members={members.filter((m) => m.is_active)}
          busy={saving}
          onClose={() => { setModal(null); setSelectedEvent(null) }}
          onSubmit={async (data) => {
            setSaving(true)
            await onRecordEntry(data)
            setSaving(false)
            setModal(null)
            setSelectedEvent(null)
          }}
        />
      )}

      {modal === 'record_expense' && selectedEvent && (
        <EventTransactionDialog
          type="expense"
          event={selectedEvent}
          members={members.filter((m) => m.is_active)}
          busy={saving}
          onClose={() => { setModal(null); setSelectedEvent(null) }}
          onSubmit={async (data) => {
            setSaving(true)
            await onRecordEntry(data)
            setSaving(false)
            setModal(null)
            setSelectedEvent(null)
          }}
        />
      )}
    </>
  )
}

function EventDialog({
  title,
  subtitle,
  initial,
  busy,
  onClose,
  onSubmit,
}: {
  title: string
  subtitle: string
  initial?: BatchEvent
  busy: boolean
  onClose: () => void
  onSubmit: (draft: EventDraft) => Promise<void>
}) {
  const [eventTitle, setEventTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [eventDate, setEventDate] = useState(initial?.event_date ?? today())
  const [targetAmount, setTargetAmount] = useState(String(initial?.target_amount ?? ''))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!eventTitle.trim()) return
    await onSubmit({
      title: eventTitle.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      target_amount: Number(targetAmount) || 0,
    })
  }

  return (
    <Dialog title={title} subtitle={subtitle} onClose={onClose}>
      <form className="dialog-form" onSubmit={handleSubmit}>
        <label>
          Event title
          <input
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Annual Batch Trip, Cricket Tournament"
            autoFocus
            required
            maxLength={100}
          />
        </label>
        <label>
          Description <span className="optional-label">optional</span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add brief details about the event, venue, or budget…"
            maxLength={400}
          />
        </label>
        <div className="form-two-col">
          <label>
            Event date
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </label>
          <label>
            Collection target (LKR) <span className="optional-label">optional</span>
            <input
              type="number"
              min="0"
              step="100"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={busy || !eventTitle.trim()}>
            {busy ? 'Saving…' : <><Check size={15} /> Save event</>}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function EventTransactionDialog({
  type,
  event,
  members,
  busy,
  onClose,
  onSubmit,
}: {
  type: 'event' | 'expense'
  event: BatchEvent
  members: Member[]
  busy: boolean
  onClose: () => void
  onSubmit: (draft: {
    entry_type: 'event' | 'expense'
    amount: number
    member_id: string | null
    event_id: string
    event_name: string
    notes: string | null
    entry_date: string
  }) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [memberId, setMemberId] = useState('')
  const [notes, setNotes] = useState('')
  const [entryDate, setEntryDate] = useState(today())

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount <= 0) return

    await onSubmit({
      entry_type: type,
      amount: numAmount,
      member_id: memberId || null,
      event_id: event.id,
      event_name: event.title,
      notes: notes.trim() || null,
      entry_date: entryDate,
    })
  }

  const isExpense = type === 'expense'

  return (
    <Dialog
      title={isExpense ? `Record expense for "${event.title}"` : `Record collection for "${event.title}"`}
      subtitle={isExpense ? 'Add a withdrawal or expense receipt for this event.' : 'Record a payment or contribution received for this event.'}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={handleSubmit}>
        <div className="form-two-col">
          <label>
            Amount (LKR)
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              autoFocus
              required
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Contributed by / Payee <span className="optional-label">optional</span>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">No specific batch member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                #{m.registration_number} · {m.full_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Description / Note
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isExpense ? 'e.g. Bus advance payment, lunch catering' : 'e.g. Ticket collection, sponsor chip-in'}
            required={isExpense}
            maxLength={250}
          />
        </label>

        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={busy || !amount}>
            {busy ? 'Saving…' : <><Check size={15} /> Save record</>}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
