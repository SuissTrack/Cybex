import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../lib/database.types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean

  initialize: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false })
      return
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    set({ session })

    if (session?.user) {
      await get().refreshProfile()
    }

    set({ loading: false })

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session })
      if (session?.user) {
        await get().refreshProfile()
      } else {
        set({ profile: null })
      }
    })
  },

  signInWithEmail: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ session: null, profile: null })
  },

  updateProfile: async (data: Partial<Profile>) => {
    const { session } = get()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) throw error
    set({ profile: updated })
  },

  refreshProfile: async () => {
    const { session } = get()
    if (!session?.user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error) {
      // Profile doesn't exist yet — create it
      if (error.code === 'PGRST116') {
        const { data: created } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name ?? null,
          })
          .select()
          .single()
        set({ profile: created ?? null })
      }
      return
    }

    set({ profile: data })
  },
}))
