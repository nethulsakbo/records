import { CalendarDays, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  )
}

export function MonthPicker({ month, setMonth }: { month: string; setMonth: (value: string) => void }) {
  return (
    <label className="month-picker">
      <CalendarDays size={16} />
      <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Select month" />
      <ChevronDown size={14} />
    </label>
  )
}
