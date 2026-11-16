import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AppRole, EntryType } from '../lib/database.types'
import type { Member, LedgerEntry, FundOverviewSummary, EntryDraft, PendingUser, Tab, TransactionFilter, UserProfile, BatchEvent, EventDraft } from '../lib/types'
import { MONTHLY_CONTRIBUTION, currentMonth, today } from '../lib/formatters'
import { loadWorkspaceData } from '../lib/queries'
import {
  approveUser as approveUserMutation,
  createBatchEvent,
  createMember,
  recordLedgerEntry,
  rejectPendingUser,
  removeBatchEvent,
  removeLedgerEntry,
  setMemberActive,
  setUserRole,
  updateBatchEvent,
} from '../lib/mutations'

export function useFundWorkspace(client: NonNullable<typeof supabase>, session: Session) {
  const [role, setRole] = useState<AppRole | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userMember, setUserMember] = useState<Member | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [ownEntries, setOwnEntries] = useState<LedgerEntry[]>([])
  const [events, setEvents] = useState<BatchEvent[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([])
  const [viewerSummary, setViewerSummary] = useState<FundOverviewSummary | null>(null)
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
    const result = await loadWorkspaceData(client, userId, month)
    if (result.kind === 'error') {
      setError(result.message)
      setLoading(false)
      return
    }
    if (result.kind === 'pending') {
      setRole('pending')
      setUserProfile(result.profile ?? null)
      setMembers([])
      setEntries([])
      setOwnEntries([])
      setEvents([])
      setPendingUsers([])
      setAllProfiles([])
      setError('')
      setLoading(false)
      return
    }
    if (result.kind === 'viewer') {
      setRole('viewer')
      setUserProfile(result.profile)
      setUserMember(result.member)
      setOwnEntries(result.ownEntries)
      setEvents(result.events)
      setEntries(result.eventEntries)
      setViewerSummary(result.summary)
      setMembers([])
      setPendingUsers([])
      setAllProfiles([])
      setError('')
      setLoading(false)
      return
    }

    // Admin
    setRole('admin')
    setUserProfile(result.profile)
    setMembers(result.members)
    setEntries(result.entries)
    setEvents(result.events)
    setPendingUsers(result.pendingUsers)
    setAllProfiles(result.allProfiles)
    if (result.summary) {
      setViewerSummary(result.summary)
    }

    // Match admin's own member row if available
    const matched = result.members.find((m) => m.registration_number === result.profile.registration_number)
    setUserMember(matched ?? null)
    if (matched) {
      setOwnEntries(result.entries.filter((e) => e.member_id === matched.id && e.entry_type === 'monthly'))
    }

    setError('')
    setLoading(false)
  }, [client, month])

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
    const { error: saveError } = await recordLedgerEntry(client, draft, session.user.id)
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
    const { error: addError } = await createMember(client, registration, fullName)
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
    const { error: updateError } = await setMemberActive(client, member.id, !member.is_active)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, is_active: !item.is_active } : item))
    if (action === 'restore') setError('')
  }

  async function approveUser(user: PendingUser, registrationNumber?: number, fullName?: string) {
    setError('')
    const { error: approvalError } = await approveUserMutation(client, user.id, registrationNumber, fullName)
    if (approvalError) {
      setError(approvalError.code === '23505'
        ? `Registration number ${registrationNumber ?? user.registration_number ?? ''} is already assigned to an approved account.`
        : approvalError.message)
      return
    }
    await loadData(session.user.id)
  }

  async function rejectUser(user: PendingUser) {
    setError('')
    const { error: rejectError } = await rejectPendingUser(client, user.id)
    if (rejectError) {
      setError(rejectError.message)
      return
    }
    await loadData(session.user.id)
  }

  async function changeUserRole(userId: string, newRole: AppRole) {
    setError('')
    const { error: roleError } = await setUserRole(client, userId, newRole)
    if (roleError) {
      setError(roleError.message)
      return
    }
    setAllProfiles((current) =>
      current.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
    )
    await loadData(session.user.id)
  }

  async function addBatchEvent(draft: EventDraft) {
    setError('')
    const { data, error: createError } = await createBatchEvent(client, draft, session.user.id)
    if (createError) {
      // Fallback: create mock local event if table is not yet in Supabase
      setError(createError.message)
      return
    }
    if (data) {
      setEvents((current) => [data as BatchEvent, ...current])
    }
    await loadData(session.user.id)
  }

  async function editBatchEvent(eventId: string, draft: Partial<EventDraft>) {
    setError('')
    const { error: updateError } = await updateBatchEvent(client, eventId, draft)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEvents((current) =>
      current.map((ev) => (ev.id === eventId ? { ...ev, ...draft } : ev))
    )
    await loadData(session.user.id)
  }

  async function deleteBatchEvent(eventId: string) {
    setError('')
    const { error: deleteError } = await removeBatchEvent(client, eventId)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setEvents((current) => current.filter((ev) => ev.id !== eventId))
    await loadData(session.user.id)
  }

  async function recordEventItem(draft: {
    entry_type: 'event' | 'expense'
    amount: number
    member_id: string | null
    event_id: string
    event_name: string
    notes: string | null
    entry_date: string
  }) {
    setError('')
    const { error: itemError } = await recordLedgerEntry(client, {
      entry_type: draft.entry_type,
      amount: draft.amount,
      member_id: draft.member_id,
      event_id: draft.event_id,
      event_name: draft.event_name,
      notes: draft.notes,
      entry_date: draft.entry_date,
      period_month: null,
    }, session.user.id)

    if (itemError) {
      setError(itemError.message)
      return
    }
    await loadData(session.user.id)
  }

  async function deleteEntry(entry: LedgerEntry) {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return
    setError('')
    const { error: deleteError } = await removeLedgerEntry(client, entry.id)
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

  function openEntry(entryType: EntryType = 'monthly', memberId: string | null = null, eventId: string | null = null, eventName: string | null = null) {
    setEntryDefaults({
      entry_type: entryType,
      member_id: memberId,
      period_month: `${month}-01`,
      event_id: eventId,
      event_name: eventName,
      entry_date: today(),
      amount: entryType === 'monthly' ? MONTHLY_CONTRIBUTION : 0,
    })
    setModal('entry')
  }

  return {
    role, userProfile, userMember, members, entries, ownEntries, events, pendingUsers, allProfiles, viewerSummary, month, setMonth, tab, setTab, loading, setLoading,
    error, setError, modal, setModal, entryDefaults, saving, search, setSearch,
    transactionFilter, setTransactionFilter, mobileNavOpen, setMobileNavOpen, isAdmin,
    loadData, activeMembers, monthEntries, monthlyTotal, eventTotal, balance, paidCount,
    dueCount, monthlyTarget, progress, recordEntry, addMember, toggleMember, approveUser, rejectUser, changeUserRole,
    addBatchEvent, editBatchEvent, deleteBatchEvent, recordEventItem, deleteEntry,
    signOut, openEntry,
  }
}

