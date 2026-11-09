import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AppRole, EntryType } from '../lib/database.types'
import type { Member, LedgerEntry, FundOverviewSummary, EntryDraft, PendingUser, Tab, TransactionFilter } from '../lib/types'
import { MONTHLY_CONTRIBUTION, currentMonth, today } from '../lib/formatters'
import { loadWorkspaceData } from '../lib/queries'
import { approveUser as approveUserMutation, createMember, recordLedgerEntry, removeLedgerEntry, setMemberActive } from '../lib/mutations'

export function useFundWorkspace(client: NonNullable<typeof supabase>, session: Session) {
  const [role, setRole] = useState<AppRole | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
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
      setMembers([])
      setEntries([])
      setPendingUsers([])
      setError('')
      setLoading(false)
      return
    }
    if (result.kind === 'viewer') {
      setRole('viewer')
      setViewerSummary(result.summary)
      setMembers([])
      setEntries([])
      setPendingUsers([])
      setError('')
      setLoading(false)
      return
    }
    setRole(result.role)
    setMembers(result.members)
    setEntries(result.entries)
    setPendingUsers(result.pendingUsers)
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

  async function approveUser(user: PendingUser, registrationNumber?: number) {
    setError('')
    const { error: approvalError } = await approveUserMutation(client, user.id, registrationNumber)
    if (approvalError) {
      setError(approvalError.code === '23505'
        ? `Registration number ${user.registration_number ?? ''} is already assigned to an approved account.`
        : approvalError.message)
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

  function openEntry(entryType: EntryType = 'monthly', memberId: string | null = null) {
    setEntryDefaults({
      entry_type: entryType,
      member_id: memberId,
      period_month: `${month}-01`,
      entry_date: today(),
      amount: entryType === 'monthly' ? MONTHLY_CONTRIBUTION : 0,
    })
    setModal('entry')
  }

  return {
    role, members, entries, pendingUsers, viewerSummary, month, setMonth, tab, setTab, loading, setLoading,
    error, setError, modal, setModal, entryDefaults, saving, search, setSearch,
    transactionFilter, setTransactionFilter, mobileNavOpen, setMobileNavOpen, isAdmin,
    loadData, activeMembers, monthEntries, monthlyTotal, eventTotal, balance, paidCount,
    dueCount, monthlyTarget, progress, recordEntry, addMember, toggleMember, approveUser, deleteEntry,
    signOut, openEntry,
  }
}
