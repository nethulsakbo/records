export type AppRole = 'admin' | 'viewer' | 'pending'
export type EntryType = 'monthly' | 'event' | 'expense'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: AppRole
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: AppRole
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: AppRole
          created_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          registration_number: number
          full_name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          registration_number: number
          full_name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          registration_number?: number
          full_name?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
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
        Insert: {
          id?: string
          entry_type: EntryType
          amount: number
          member_id?: string | null
          period_month?: string | null
          event_name?: string | null
          notes?: string | null
          entry_date?: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          entry_type?: EntryType
          amount?: number
          member_id?: string | null
          period_month?: string | null
          event_name?: string | null
          notes?: string | null
          entry_date?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ledger_entries_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_fund_overview: {
        Args: { p_month: string }
        Returns: {
          active_members: number
          monthly_total: number
          event_total: number
          monthly_paid_members: number
          total_contributions: number
          total_events: number
          total_expenses: number
          balance: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
