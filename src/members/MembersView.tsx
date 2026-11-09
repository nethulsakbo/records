import { BadgeCheck, ChevronDown, Plus, Search, Settings2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Member, LedgerEntry } from '../lib/types'
import { longDate, displayMonth } from '../lib/formatters'
import { Dialog } from '../components/Dialog'
import { PageHeading } from '../components/PageHeading'

export function MembersView({
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

export function MemberCell({ member }: { member: Member }) {
  const initials = member.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <div className="member-cell"><span className={`member-avatar avatar-${member.registration_number % 5}`}>{initials}</span><span><strong>{member.full_name}</strong><small>{member.is_active ? 'Batch member' : 'Archived member'}</small></span></div>
}

export function MemberDialog({
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
