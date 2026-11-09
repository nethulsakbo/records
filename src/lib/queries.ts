import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRole, Database } from './database.types'
import type { FundOverviewSummary, LedgerEntry, Member, PendingUser } from './types'

type WorkspaceData =
  | { kind: 'error'; message: string }
  | { kind: 'pending' }
  | { kind: 'viewer'; summary: FundOverviewSummary }
  | { kind: 'member'; role: AppRole; members: Member[]; entries: LedgerEntry[]; pendingUsers: PendingUser[] }

export async function loadWorkspaceData(
  client: SupabaseClient<Database>,
  userId: string,
  month: string,
): Promise<WorkspaceData> {
  const profileResult = await client.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (profileResult.error) return { kind: 'error', message: profileResult.error.message }
  if (!profileResult.data) {
    return {
      kind: 'error',
      message: 'Your account profile is missing. Ask an administrator to check the database setup.',
    }
  }
  if (profileResult.data.role === 'pending') return { kind: 'pending' }

  if (profileResult.data.role === 'viewer') {
    const summaryResult = await client
      .rpc('get_fund_overview', { p_month: `${month}-01` })
      .single()
    if (summaryResult.error) return { kind: 'error', message: summaryResult.error.message }
    return { kind: 'viewer', summary: summaryResult.data }
  }

  const memberResult = await client.from('members').select('*').order('registration_number')
  if (memberResult.error) return { kind: 'error', message: memberResult.error.message }

  const pendingResult = await client
    .from('profiles')
    .select('id, email, registration_number, created_at')
    .eq('role', 'pending')
    .order('created_at')
  if (pendingResult.error) return { kind: 'error', message: pendingResult.error.message }

  const entries: LedgerEntry[] = []
  for (let offset = 0; ; offset += 1000) {
    const entryResult = await client
      .from('ledger_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 999)
    if (entryResult.error) return { kind: 'error', message: entryResult.error.message }

    entries.push(...entryResult.data)
    if (entryResult.data.length < 1000) break
  }

  return {
    kind: 'member',
    role: profileResult.data.role,
    members: memberResult.data,
    entries,
    pendingUsers: pendingResult.data,
  }
}
