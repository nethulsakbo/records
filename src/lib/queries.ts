import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type { BatchEvent, FundOverviewSummary, LedgerEntry, Member, PendingUser, UserProfile } from './types'

export type WorkspaceData =
  | { kind: 'error'; message: string }
  | { kind: 'pending'; profile?: UserProfile }
  | {
      kind: 'viewer'
      profile: UserProfile
      member: Member | null
      ownEntries: LedgerEntry[]
      events: BatchEvent[]
      eventEntries: LedgerEntry[]
      summary: FundOverviewSummary
    }
  | {
      kind: 'admin'
      role: 'admin'
      profile: UserProfile
      members: Member[]
      entries: LedgerEntry[]
      events: BatchEvent[]
      pendingUsers: PendingUser[]
      allProfiles: UserProfile[]
      summary?: FundOverviewSummary
    }

async function fetchEvents(
  client: SupabaseClient<Database>,
  ledgerEntries?: LedgerEntry[],
): Promise<BatchEvent[]> {
  const eventMap = new Map<string, BatchEvent>()

  try {
    const { data, error } = await client.from('events').select('*').order('event_date', { ascending: false })
    if (!error && data) {
      for (const item of data) {
        eventMap.set(item.id, item as BatchEvent)
      }
    }
  } catch {
    // fallback if table is not yet created
  }

  // Synthesize from existing ledger entries if any
  if (ledgerEntries) {
    for (const entry of ledgerEntries) {
      if (entry.event_name && (entry.entry_type === 'event' || entry.entry_type === 'expense')) {
        const key = entry.event_id || entry.event_name
        if (!eventMap.has(key)) {
          eventMap.set(key, {
            id: key,
            title: entry.event_name,
            description: null,
            event_date: entry.entry_date,
            target_amount: 0,
            created_at: entry.created_at,
          })
        }
      }
    }
  }

  return Array.from(eventMap.values()).sort((a, b) => b.event_date.localeCompare(a.event_date))
}

export async function loadWorkspaceData(
  client: SupabaseClient<Database>,
  userId: string,
  month: string,
): Promise<WorkspaceData> {
  const profileResult = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (profileResult.error) return { kind: 'error', message: profileResult.error.message }
  if (!profileResult.data) {
    return {
      kind: 'error',
      message: 'Your account profile is missing. Ask an administrator to check the database setup.',
    }
  }

  const profile = profileResult.data as UserProfile
  if (profile.role === 'pending') {
    return { kind: 'pending', profile }
  }

  // For normal users / viewers:
  if (profile.role === 'viewer') {
    const summaryResult = await client
      .rpc('get_fund_overview', { p_month: `${month}-01` })
      .single()
    if (summaryResult.error) return { kind: 'error', message: summaryResult.error.message }

    // Fetch own member record if registration_number is set
    let member: Member | null = null
    let ownEntries: LedgerEntry[] = []

    if (profile.registration_number) {
      const memberRes = await client
        .from('members')
        .select('*')
        .eq('registration_number', profile.registration_number)
        .maybeSingle()
      if (memberRes.data) {
        member = memberRes.data as Member
        const entriesRes = await client
          .from('ledger_entries')
          .select('*')
          .eq('member_id', member.id)
          .eq('entry_type', 'monthly')
          .order('period_month', { ascending: false })
        if (entriesRes.data) {
          ownEntries = entriesRes.data as LedgerEntry[]
        }
      }
    }

    // Fetch event collections and expenses (for events view and transparency)
    const eventEntriesRes = await client
      .from('ledger_entries')
      .select('*')
      .in('entry_type', ['event', 'expense'])
      .order('entry_date', { ascending: false })

    const eventEntries = (eventEntriesRes.data ?? []) as LedgerEntry[]
    const events = await fetchEvents(client, eventEntries)

    return {
      kind: 'viewer',
      profile,
      member,
      ownEntries,
      events,
      eventEntries,
      summary: summaryResult.data as FundOverviewSummary,
    }
  }

  // For admins:
  const memberResult = await client.from('members').select('*').order('registration_number')
  if (memberResult.error) return { kind: 'error', message: memberResult.error.message }

  const pendingResult = await client
    .from('profiles')
    .select('id, email, registration_number, created_at')
    .eq('role', 'pending')
    .order('created_at')
  if (pendingResult.error) return { kind: 'error', message: pendingResult.error.message }

  const allProfilesResult = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  const allProfiles = (allProfilesResult.data ?? []) as UserProfile[]

  const entries: LedgerEntry[] = []
  for (let offset = 0; ; offset += 1000) {
    const entryResult = await client
      .from('ledger_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 999)
    if (entryResult.error) return { kind: 'error', message: entryResult.error.message }

    entries.push(...(entryResult.data as LedgerEntry[]))
    if (entryResult.data.length < 1000) break
  }

  const events = await fetchEvents(client, entries)

  let summary: FundOverviewSummary | undefined
  try {
    const summaryResult = await client
      .rpc('get_fund_overview', { p_month: `${month}-01` })
      .single()
    if (!summaryResult.error && summaryResult.data) {
      summary = summaryResult.data as FundOverviewSummary
    }
  } catch {
    // continue if summary RPC fails
  }

  return {
    kind: 'admin',
    role: 'admin',
    profile,
    members: memberResult.data as Member[],
    entries,
    events,
    pendingUsers: pendingResult.data as PendingUser[],
    allProfiles,
    summary,
  }
}
