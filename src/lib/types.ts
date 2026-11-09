import type { EntryType } from './database.types'

export type Member = {
  id: string
  registration_number: number
  full_name: string
  is_active: boolean
  created_at: string
}

export type PendingUser = {
  id: string
  email: string
  registration_number: number | null
  created_at: string
}

export type LedgerEntry = {
  id: string
  entry_type: EntryType
  amount: number
  member_id: string | null
  period_month: string | null
  event_name: string | null
  notes: string | null
  entry_date: string
  created_by: string
  created_at: string
}

export type FundOverviewSummary = {
  active_members: number
  monthly_total: number
  event_total: number
  monthly_paid_members: number
  total_contributions: number
  total_events: number
  total_expenses: number
  balance: number
}

export type EntryDraft = {
  entry_type: EntryType
  amount: number
  member_id: string | null
  period_month: string | null
  event_name: string | null
  notes: string | null
  entry_date: string
}

export type Tab = 'overview' | 'contributions' | 'members' | 'transactions' | 'approvals'

export type TransactionFilter = 'all' | 'event' | 'expense'
