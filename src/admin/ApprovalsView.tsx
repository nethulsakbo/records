import { Check, Clock3, ShieldCheck, UserCheck, UserPlus, UserRoundCheck, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import { longDate } from '../lib/formatters'
import type { Member, PendingUser } from '../lib/types'

export function ApprovalsView({
  pendingUsers,
  members,
  onApprove,
  onDecline,
}: {
  pendingUsers: PendingUser[]
  members: Member[]
  onApprove: (user: PendingUser, registrationNumber?: number, fullName?: string) => Promise<void>
  onDecline?: (user: PendingUser) => Promise<void>
}) {
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [assignedNumbers, setAssignedNumbers] = useState<Record<string, string>>({})
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  // Determine available registration numbers (1-220 not taken by active members)
  const takenNumbers = new Set(members.map((m) => m.registration_number))
  const availableNumbers = Array.from({ length: 220 }, (_, i) => i + 1).filter((num) => !takenNumbers.has(num))

  async function handleApprove(user: PendingUser) {
    const regNum = user.registration_number ?? (assignedNumbers[user.id] ? Number(assignedNumbers[user.id]) : undefined)
    const existingMember = regNum ? members.find((m) => m.registration_number === regNum) : undefined
    const nameToUse = existingMember?.full_name ?? memberNames[user.id] ?? user.full_name ?? user.email.split('@')[0]

    setApprovingId(user.id)
    try {
      await onApprove(user, regNum, nameToUse)
    } finally {
      setApprovingId(null)
    }
  }

  async function handleDecline(user: PendingUser) {
    if (!window.confirm(`Decline access for ${user.email}? This request will be removed.`)) return
    if (onDecline) {
      setApprovingId(user.id)
      try {
        await onDecline(user)
      } finally {
        setApprovingId(null)
      }
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="New member approvals"
        detail="Review and approve new member registration requests to grant access to the batch fund."
      />

      <section className="panel data-panel">
        <div className="table-toolbar">
          <div>
            <h2>Pending approval requests</h2>
            <span>{pendingUsers.length} {pendingUsers.length === 1 ? 'account' : 'accounts'} awaiting review</span>
          </div>
          <span className="approval-note">
            <Clock3 size={14} /> New accounts remain locked until an admin approves them
          </span>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>REQUESTED REG. NO.</th>
                <th>MEMBER MATCH &amp; DIRECTORY</th>
                <th>REQUESTED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => {
                const regNum = user.registration_number ?? (assignedNumbers[user.id] ? Number(assignedNumbers[user.id]) : undefined)
                const existingMember = regNum ? members.find((m) => m.registration_number === regNum) : undefined
                const isBusy = approvingId === user.id

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-email-cell">
                        <strong className="approval-email">{user.email}</strong>
                        {user.full_name && <small className="approval-meta-name">{user.full_name}</small>}
                      </div>
                    </td>
                    <td>
                      {user.registration_number ? (
                        <div className="reg-number-wrap">
                          <span className="registration-tag">#{user.registration_number}</span>
                          <button
                            type="button"
                            className="text-link-mini"
                            onClick={() => {
                              setAssignedNumbers((prev) => ({
                                ...prev,
                                [user.id]: prev[user.id] ? '' : String(user.registration_number),
                              }))
                            }}
                          >
                            Change
                          </button>
                        </div>
                      ) : null}

                      {(!user.registration_number || assignedNumbers[user.id] !== undefined) && (
                        <select
                          className="approval-number-select"
                          aria-label={`Assign registration number to ${user.email}`}
                          value={assignedNumbers[user.id] ?? (user.registration_number ? String(user.registration_number) : '')}
                          onChange={(e) => setAssignedNumbers((prev) => ({ ...prev, [user.id]: e.target.value }))}
                        >
                          <option value="">Select number (1–220)</option>
                          {user.registration_number && (
                            <option value={user.registration_number}>#{user.registration_number} (Requested)</option>
                          )}
                          {members.map((m) => (
                            <option key={m.id} value={m.registration_number}>
                              #{m.registration_number} · {m.full_name} {m.is_active ? '' : '(Archived)'}
                            </option>
                          ))}
                          {availableNumbers.map((num) => (
                            <option key={num} value={num}>#{num} (Unassigned)</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {existingMember ? (
                        <span className={`approval-match ${existingMember.is_active ? 'match-active' : 'match-archived'}`}>
                          <UserCheck size={14} />
                          <strong>{existingMember.full_name}</strong>
                          <small>{existingMember.is_active ? 'Active member' : 'Archived member'}</small>
                        </span>
                      ) : regNum ? (
                        <div className="new-member-prompt">
                          <span className="badge-new-member"><UserPlus size={12} /> New directory entry</span>
                          <input
                            type="text"
                            className="member-name-input"
                            placeholder="Enter member's full name"
                            value={memberNames[user.id] ?? user.full_name ?? ''}
                            onChange={(e) => setMemberNames((prev) => ({ ...prev, [user.id]: e.target.value }))}
                          />
                        </div>
                      ) : (
                        <span className="approval-unmatched">Assign a registration number</span>
                      )}
                    </td>
                    <td>{longDate.format(new Date(user.created_at))}</td>
                    <td className="table-action-cell">
                      <div className="approval-actions-group">
                        <button
                          className="small-action approve-action-btn"
                          disabled={isBusy || !regNum}
                          onClick={() => void handleApprove(user)}
                          title={!regNum ? 'Assign a registration number first' : 'Approve account and activate batch access'}
                        >
                          {isBusy ? (
                            <><Clock3 size={13} /> Approving…</>
                          ) : (
                            <><Check size={13} /> Approve</>
                          )}
                        </button>
                        {onDecline && (
                          <button
                            className="small-action remove-payment"
                            disabled={isBusy}
                            onClick={() => void handleDecline(user)}
                            title="Decline request"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pendingUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-empty">
                    <UserRoundCheck size={20} style={{ margin: '0 auto 8px', display: 'block', color: '#859b90' }} />
                    There are no accounts waiting for approval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>{pendingUsers.length} pending review</span>
          <span><ShieldCheck size={13} /> Approvals create and verify active batch member records</span>
        </div>
      </section>
    </>
  )
}
