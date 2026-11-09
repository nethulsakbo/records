import { Check, Clock3, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import { longDate } from '../lib/formatters'
import type { Member, PendingUser } from '../lib/types'

export function ApprovalsView({
  pendingUsers,
  members,
  onApprove,
}: {
  pendingUsers: PendingUser[]
  members: Member[]
  onApprove: (user: PendingUser, registrationNumber?: number) => Promise<void>
}) {
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [assignedNumbers, setAssignedNumbers] = useState<Record<string, string>>({})

  async function approve(user: PendingUser, registrationNumber?: number) {
    setApprovingId(user.id)
    await onApprove(user, registrationNumber)
    setApprovingId(null)
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="User approvals"
        detail="Check each registration number against the active member directory before granting access."
      />
      <section className="panel data-panel">
        <div className="table-toolbar">
          <div><h2>Pending requests</h2><span>{pendingUsers.length} awaiting review</span></div>
          <span className="approval-note"><Clock3 size={14} />New accounts stay locked until approved</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>ACCOUNT</th><th>REG. NO.</th><th>MEMBER CHECK</th><th>REQUESTED</th><th /></tr></thead>
            <tbody>
              {pendingUsers.map((user) => {
                const registrationNumber = user.registration_number ?? Number(assignedNumbers[user.id])
                const member = members.find((item) => item.registration_number === registrationNumber)
                const canApprove = Boolean(registrationNumber && member?.is_active)
                return (
                  <tr key={user.id}>
                    <td><strong className="approval-email">{user.email}</strong></td>
                    <td>{user.registration_number
                      ? <span className="registration-tag">#{user.registration_number}</span>
                      : <select
                        className="approval-number-select"
                        aria-label={`Assign registration number to ${user.email}`}
                        value={assignedNumbers[user.id] ?? ''}
                        onChange={(event) => setAssignedNumbers((current) => ({ ...current, [user.id]: event.target.value }))}
                      >
                        <option value="">Select number</option>
                        {members.filter((item) => item.is_active).map((item) => (
                          <option key={item.id} value={item.registration_number}>#{item.registration_number}</option>
                        ))}
                      </select>}
                    </td>
                    <td>{member ? <span className={member.is_active ? 'approval-match' : 'approval-unmatched'}>{member.full_name}{!member.is_active && ' · archived'}</span> : <span className="approval-unmatched">{user.registration_number ? 'Add active member first' : 'Select a roster number'}</span>}</td>
                    <td>{longDate.format(new Date(user.created_at))}</td>
                    <td className="table-action-cell">
                      <button
                        className="small-action"
                        disabled={!canApprove || approvingId !== null}
                        onClick={() => void approve(user, user.registration_number === null ? registrationNumber : undefined)}
                        title={!canApprove ? 'Match this account to an active member before approval.' : undefined}
                      >
                        {approvingId === user.id ? <><Clock3 size={13} />Approving…</> : <><Check size={13} />Approve</>}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {pendingUsers.length === 0 && <tr><td colSpan={5} className="table-empty">There are no accounts waiting for approval.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>{pendingUsers.length} pending</span><span><UserRoundCheck size={13} />Admin-managed access</span></div>
      </section>
    </>
  )
}
