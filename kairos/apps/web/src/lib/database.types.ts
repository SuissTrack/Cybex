// Supabase Database types — matches the schema in supabase/migrations/001_initial.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE' | 'AUTRE'
export type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE'
export type ApplicationStatus =
  | 'interested'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'

export interface LanguageSkill {
  code: string
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native'
}

// ─── Convenience alias (used in stores / components) ─────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Application = Database['public']['Tables']['applications']['Row']
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']
export type JobAlert = Database['public']['Tables']['job_alerts']['Row']

// ─── Database schema ──────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          city: string | null
          canton: string | null
          target_role: string | null
          languages: Json
          contract_types: string[]
          preferred_cantons: string[]
          key_skills: string[]
          workload_min: number
          workload_max: number
          salary_min: number | null
          work_mode: string | null
          email_alerts: boolean
          cv_url: string | null
          onboarding_done: boolean
          credits: number
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          city?: string | null
          canton?: string | null
          target_role?: string | null
          languages?: Json
          contract_types?: string[]
          preferred_cantons?: string[]
          key_skills?: string[]
          workload_min?: number
          workload_max?: number
          salary_min?: number | null
          work_mode?: string | null
          email_alerts?: boolean
          cv_url?: string | null
          onboarding_done?: boolean
          credits?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          city?: string | null
          canton?: string | null
          target_role?: string | null
          languages?: Json
          contract_types?: string[]
          preferred_cantons?: string[]
          key_skills?: string[]
          workload_min?: number
          workload_max?: number
          salary_min?: number | null
          work_mode?: string | null
          email_alerts?: boolean
          cv_url?: string | null
          onboarding_done?: boolean
          credits?: number
        }
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          created_at: string
          user_id: string
          job_id: string
          job_title: string
          company: string | null
          status: string
          notes: string | null
          applied_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          job_id: string
          job_title: string
          company?: string | null
          status?: string
          notes?: string | null
          applied_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          job_id?: string
          job_title?: string
          company?: string | null
          status?: string
          notes?: string | null
          applied_at?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          amount: number
          reason: string
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          amount: number
          reason: string
          metadata?: Json
        }
        Update: never
        Relationships: []
      }
      job_alerts: {
        Row: {
          id: string
          created_at: string
          user_id: string
          name: string
          filters: Json
          active: boolean
          last_sent_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          name: string
          filters?: Json
          active?: boolean
          last_sent_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          name?: string
          filters?: Json
          active?: boolean
          last_sent_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
