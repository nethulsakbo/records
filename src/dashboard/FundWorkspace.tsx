import { ArrowDownLeft, BadgeCheck, CalendarDays, ChevronDown, Clock3, Coins, LogOut, Menu, Plus, Settings2, Shield, ShieldCheck, UserRoundCheck, Users, Wallet, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Tab } from '../lib/types'
import { useFundWorkspace } from './useFundWorkspace'
import { Overview, ViewerOverview } from './Overview'
import { MembersView, MemberDialog } from '../members/MembersView'
import { Contributions, Transactions, EntryDialog } from '../transactions/Transactions'
import { ApprovalsView } from '../admin/ApprovalsView'
import { AdminManagementView } from '../admin/AdminManagementView'
import { EventsView } from '../events/EventsView'

export function FundWorkspace({
  client,
  session,
}: {
  client: NonNullable<typeof supabase>
  session: Session
}) {
  const {
    role, userProfile, userMember, members, entries, ownEntries, events, pendingUsers, allProfiles, viewerSummary, month, setMonth, tab, setTab, loading, setLoading,
    error, setError, modal, setModal, entryDefaults, saving, search, setSearch,
    transactionFilter, setTransactionFilter, mobileNavOpen, setMobileNavOpen, isAdmin,
    loadData, activeMembers, monthEntries, monthlyTotal, eventTotal, balance, paidCount,
    dueCount, monthlyTarget, progress, recordEntry, addMember, toggleMember, deleteEntry,
    signOut, openEntry, approveUser, rejectUser, changeUserRole,
    addBatchEvent, editBatchEvent, deleteBatchEvent, recordEventItem,
  } = useFundWorkspace(client, session)

  const adminNavItems: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Wallet size={18} /> },
    { key: 'contributions', label: 'Contributions', icon: <Coins size={18} /> },
    { key: 'members', label: 'Members', icon: <Users size={18} /> },
    { key: 'events', label: 'Events & Collections', icon: <CalendarDays size={18} /> },
    { key: 'transactions', label: 'Transactions', icon: <ArrowDownLeft size={18} /> },
    { key: 'approvals', label: 'Approvals', icon: <UserRoundCheck size={18} /> },
    { key: 'roles', label: 'User Roles & Admins', icon: <Shield size={18} /> },
  ]

  const userNavItems: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'overview', label: 'My Dashboard', icon: <Wallet size={18} /> },
    { key: 'events', label: 'Events & Collections', icon: <CalendarDays size={18} /> },
  ]

  const navItems = isAdmin ? adminNavItems : userNavItems

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
        <p>A fund administrator needs to approve your registration number (#{userProfile?.registration_number ?? 'pending'}) before you can view the batch records.</p>
        <button className="button button-secondary" onClick={() => { setLoading(true); void loadData(session.user.id) }}>Check status</button>
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
              {item.icon}<span>{item.label}</span>
              {item.key === 'contributions' && dueCount > 0 && <span className="nav-count nav-count-pending">{dueCount}</span>}
              {item.key === 'approvals' && pendingUsers.length > 0 && <span className="nav-count nav-count-approvals">{pendingUsers.length}</span>}
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
          <div className="breadcrumb"><span>University batch</span><span className="crumb-slash">/</span><strong>{navItems.find((item) => item.key === tab)?.label ?? 'Workspace'}</strong></div>
          <div className="topbar-actions">
            <div className="sync-status"><span className="sync-dot" />{isAdmin ? 'Admin workspace' : 'Member view'}</div>
            {isAdmin && <button className="button button-primary top-add" onClick={() => openEntry('monthly')}><Plus size={16} /><span>Record payment</span></button>}
            <button className="user-avatar top-avatar" onClick={() => void signOut()} title="Sign out">{session.user.email?.slice(0, 1).toUpperCase() ?? 'U'}</button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="error-banner" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}

          {/* Normal User Dashboard */}
          {!isAdmin && tab === 'overview' && userProfile && viewerSummary && (
            <ViewerOverview
              summary={viewerSummary}
              month={month}
              setMonth={setMonth}
              profile={userProfile}
              member={userMember}
              ownEntries={ownEntries}
              onNavigate={setTab}
            />
          )}

          {/* Normal User & Admin Events View */}
          {tab === 'events' && (
            <EventsView
              events={events}
              entries={entries}
              members={members}
              canEdit={isAdmin}
              onAddEvent={addBatchEvent}
              onEditEvent={editBatchEvent}
              onDeleteEvent={deleteBatchEvent}
              onRecordEntry={recordEventItem}
              onDeleteEntry={deleteEntry}
            />
          )}

          {/* Admin Dashboard */}
          {isAdmin && tab === 'overview' && (
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

          {/* Admin Contributions View */}
          {isAdmin && tab === 'contributions' && (
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

          {/* Admin Members View */}
          {isAdmin && tab === 'members' && (
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

          {/* Admin Transactions View */}
          {isAdmin && tab === 'transactions' && (
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

          {/* Admin Approvals View */}
          {isAdmin && tab === 'approvals' && (
            <ApprovalsView
              pendingUsers={pendingUsers}
              members={members}
              onApprove={approveUser}
              onDecline={rejectUser}
            />
          )}

          {/* Admin User Roles & Manage Admins View */}
          {isAdmin && tab === 'roles' && (
            <AdminManagementView
              profiles={allProfiles}
              members={members}
              currentUserId={session.user.id}
              onUpdateRole={changeUserRole}
            />
          )}
        </div>

        <footer className="page-footer"><span>Batchfund</span><span>Built for your batch, kept in balance.</span><span className="creator-tag">Created by nethulguy@gmail.com</span><button className="footer-settings" title="Shared, secure workspace"><Settings2 size={15} />Secure workspace</button></footer>
      </main>

      {mobileNavOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {modal === 'member' && <MemberDialog members={members} busy={saving} onClose={() => setModal(null)} onSubmit={addMember} />}
      {modal === 'entry' && <EntryDialog members={activeMembers} events={events} defaults={entryDefaults} busy={saving} onClose={() => setModal(null)} onSubmit={recordEntry} />}
    </div>
  )
}

