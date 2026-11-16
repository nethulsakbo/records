import { Clock3, Search, Shield, ShieldAlert, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { PageHeading } from '../components/PageHeading'
import { longDate } from '../lib/formatters'
import type { AppRole } from '../lib/database.types'
import type { Member, UserProfile } from '../lib/types'

export function AdminManagementView({
  profiles,
  members,
  currentUserId,
  onUpdateRole,
}: {
  profiles: UserProfile[]
  members: Member[]
  currentUserId: string
  onUpdateRole: (userId: string, newRole: AppRole) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'viewer'>('all')

  const adminCount = profiles.filter((p) => p.role === 'admin').length
  const memberCount = profiles.filter((p) => p.role === 'viewer').length

  const filtered = profiles.filter((p) => {
    if (filterRole !== 'all' && p.role !== filterRole) return false
    const term = search.toLowerCase().trim()
    if (!term) return true
    if (p.email.toLowerCase().includes(term)) return true
    if (p.registration_number && String(p.registration_number).includes(term.replace(/^#/, ''))) return true
    const member = members.find((m) => m.registration_number === p.registration_number)
    if (member && member.full_name.toLowerCase().includes(term)) return true
    return false
  })

  async function handleToggleRole(targetUser: UserProfile) {
    if (targetUser.id === currentUserId && targetUser.role === 'admin') {
      alert('You cannot remove admin privileges from your own account.')
      return
    }

    const newRole: AppRole = targetUser.role === 'admin' ? 'viewer' : 'admin'
    const actionLabel = newRole === 'admin' ? 'promote this user to Administrator' : 'remove Administrator privileges from this user'

    if (!window.confirm(`Are you sure you want to ${actionLabel} (${targetUser.email})?`)) {
      return
    }

    setBusyId(targetUser.id)
    await onUpdateRole(targetUser.id, newRole)
    setBusyId(null)
  }

  return (
    <>
      <PageHeading
        eyebrow="SECURITY &amp; ACCESS"
        title="Admin &amp; User Roles"
        detail="Grant or revoke administrator privileges for registered batch accounts directly from the site."
      />

      <section className="stat-grid" aria-label="Role overview">
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Total registered accounts</span>
            <span className="stat-icon blue-icon"><Users size={17} /></span>
          </div>
          <strong className="stat-value">{profiles.length}</strong>
          <div className="stat-foot">
            <span>Approved &amp; active users</span>
            <span className="stat-period">All users</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Administrators</span>
            <span className="stat-icon lilac-icon"><ShieldCheck size={17} /></span>
          </div>
          <strong className="stat-value">{adminCount}</strong>
          <div className="stat-foot">
            <span>Full manage &amp; edit access</span>
            <span className="stat-period">Admins</span>
          </div>
        </article>

        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-label">Batch members</span>
            <span className="stat-icon mint-icon"><UserCheck size={17} /></span>
          </div>
          <strong className="stat-value">{memberCount}</strong>
          <div className="stat-foot">
            <span>Personal record &amp; events view</span>
            <span className="stat-period">Normal users</span>
          </div>
        </article>
      </section>

      <section className="panel data-panel">
        <div className="table-toolbar">
          <div>
            <h2>User directory &amp; roles</h2>
            <span>{filtered.length} of {profiles.length} accounts</span>
          </div>
          <div className="toolbar-actions">
            <label className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name or reg. no."
              />
            </label>
            <div className="filter-tabs" role="group" aria-label="Filter by role">
              <button
                className={filterRole === 'all' ? 'filter-tab-active' : ''}
                onClick={() => setFilterRole('all')}
              >
                All
              </button>
              <button
                className={filterRole === 'admin' ? 'filter-tab-active' : ''}
                onClick={() => setFilterRole('admin')}
              >
                Admins ({adminCount})
              </button>
              <button
                className={filterRole === 'viewer' ? 'filter-tab-active' : ''}
                onClick={() => setFilterRole('viewer')}
              >
                Members ({memberCount})
              </button>
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>USER / EMAIL</th>
                <th>MEMBER MATCH</th>
                <th>REG. NO.</th>
                <th>ROLE</th>
                <th>REGISTERED</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const member = members.find((m) => m.registration_number === user.registration_number)
                const isCurrent = user.id === currentUserId
                const isAdmin = user.role === 'admin'
                const isBusy = busyId === user.id

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-email-cell">
                        <strong>{user.email}</strong>
                        {isCurrent && <span className="current-user-tag">You</span>}
                      </div>
                    </td>
                    <td>
                      {member ? (
                        <span className="member-name-tag">{member.full_name}</span>
                      ) : (
                        <span className="muted-cell">No roster match</span>
                      )}
                    </td>
                    <td>
                      {user.registration_number ? (
                        <span className="registration-tag">#{user.registration_number}</span>
                      ) : (
                        <span className="muted-cell">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${isAdmin ? 'role-badge-admin' : 'role-badge-member'}`}>
                        {isAdmin ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                        {isAdmin ? 'Administrator' : 'Batch Member'}
                      </span>
                    </td>
                    <td>
                      {user.created_at ? longDate.format(new Date(user.created_at)) : '—'}
                    </td>
                    <td className="table-action-cell">
                      {isCurrent ? (
                        <span className="text-muted-action">Current Account</span>
                      ) : (
                        <button
                          className={`small-action ${isAdmin ? 'remove-admin-btn' : 'make-admin-btn'}`}
                          disabled={isBusy}
                          onClick={() => void handleToggleRole(user)}
                          title={isAdmin ? 'Revoke administrator permissions' : 'Promote user to administrator'}
                        >
                          {isBusy ? (
                            <><Clock3 size={13} /> Updating…</>
                          ) : isAdmin ? (
                            <><ShieldAlert size={13} /> Remove Admin</>
                          ) : (
                            <><Shield size={13} /> Make Admin</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    {search ? 'No users match your search.' : 'No registered users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span><ShieldCheck size={13} /> Visible only to administrators</span>
          <span>{adminCount} {adminCount === 1 ? 'admin' : 'admins'} currently configured</span>
        </div>
      </section>
    </>
  )
}
