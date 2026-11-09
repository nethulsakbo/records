import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type { EntryDraft } from './types'

export function recordLedgerEntry(
  client: SupabaseClient<Database>,
  draft: EntryDraft,
  userId: string,
) {
  return client.from('ledger_entries').insert({
    ...draft,
    created_by: userId,
  })
}

export function createMember(
  client: SupabaseClient<Database>,
  registrationNumber: number,
  fullName: string,
) {
  return client.from('members').insert({
    registration_number: registrationNumber,
    full_name: fullName,
  })
}

export function setMemberActive(
  client: SupabaseClient<Database>,
  memberId: string,
  isActive: boolean,
) {
  return client.from('members').update({ is_active: isActive }).eq('id', memberId)
}

export function removeLedgerEntry(client: SupabaseClient<Database>, entryId: string) {
  return client.from('ledger_entries').delete().eq('id', entryId)
}
