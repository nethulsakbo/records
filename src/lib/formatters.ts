import type { LedgerEntry, Member } from './types'

export const MONTHLY_CONTRIBUTION = 500
export const money = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})
export const longDate = new Intl.DateTimeFormat('en-LK', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
export const shortDate = new Intl.DateTimeFormat('en-LK', {
  day: 'numeric',
  month: 'short',
})
export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
export function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function displayMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-LK', {
    month: 'long',
    year: 'numeric',
  })
}
export function displayName(entry: LedgerEntry, members: Member[]) {
  const member = members.find((item) => item.id === entry.member_id)
  return member ? `#${member.registration_number} · ${member.full_name}` : null
}
export function readableAuthError(message: string) {
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
    return 'Could not reach Supabase. Check that the project URL and public anon key are correct and from the same project, and that the project is active. After changing environment variables, restart the local dev server or redeploy on Vercel.'
  }
  return message
}
export function downloadCsv(filename: string, headers: (string | number)[], rows: (string | number)[][]) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const content = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
