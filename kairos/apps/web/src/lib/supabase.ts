import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseUrl !== 'your-supabase-url') &&
  Boolean(supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key')

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : // Dummy client that won't throw at import time
    createClient<Database>('https://placeholder.supabase.co', 'placeholder')
