import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppRole, Database } from './database.types'
import type { EntryDraft, EventDraft } from './types'

export function recordLedgerEntry(
  client: SupabaseClient<Database>,
  draft: EntryDraft,
  userId: string,
) {
  return client.from('ledger_entries').insert({
    entry_type: draft.entry_type,
    amount: draft.amount,
    member_id: draft.member_id,
    period_month: draft.period_month,
    event_name: draft.event_name,
    event_id: draft.event_id ?? null,
    notes: draft.notes,
    entry_date: draft.entry_date,
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

export async function approveUser(
  client: SupabaseClient<Database>,
  userId: string,
  registrationNumber?: number,
  fullName?: string,
) {
  if (registrationNumber && fullName) {
    // Check if member already exists; if not, create one
    const { data: existingMember } = await client
      .from('members')
      .select('id')
      .eq('registration_number', registrationNumber)
      .maybeSingle()

    if (!existingMember) {
      const { error: memberError } = await client.from('members').insert({
        registration_number: registrationNumber,
        full_name: fullName.trim(),
        is_active: true,
      })
      if (memberError && memberError.code !== '23505') {
        return { error: memberError }
      }
    }
  }

  return client.from('profiles').update({
    role: 'viewer',
    ...(registrationNumber === undefined ? {} : { registration_number: registrationNumber }),
  }).eq('id', userId)
}

export function rejectPendingUser(client: SupabaseClient<Database>, userId: string) {
  return client.from('profiles').delete().eq('id', userId)
}

export function setUserRole(
  client: SupabaseClient<Database>,
  userId: string,
  role: AppRole,
) {
  return client.from('profiles').update({ role }).eq('id', userId)
}

export function createBatchEvent(
  client: SupabaseClient<Database>,
  draft: EventDraft,
  userId: string,
) {
  return client.from('events').insert({
    title: draft.title.trim(),
    description: draft.description ? draft.description.trim() : null,
    event_date: draft.event_date,
    target_amount: draft.target_amount,
    created_by: userId,
  }).select().single()
}

export function updateBatchEvent(
  client: SupabaseClient<Database>,
  eventId: string,
  draft: Partial<EventDraft>,
) {
  return client.from('events').update({
    ...(draft.title !== undefined ? { title: draft.title.trim() } : {}),
    ...(draft.description !== undefined ? { description: draft.description ? draft.description.trim() : null } : {}),
    ...(draft.event_date !== undefined ? { event_date: draft.event_date } : {}),
    ...(draft.target_amount !== undefined ? { target_amount: draft.target_amount } : {}),
  }).eq('id', eventId)
}

export function removeBatchEvent(client: SupabaseClient<Database>, eventId: string) {
  return client.from('events').delete().eq('id', eventId)
}

export function removeLedgerEntry(client: SupabaseClient<Database>, entryId: string) {
  return client.from('ledger_entries').delete().eq('id', entryId)
}
