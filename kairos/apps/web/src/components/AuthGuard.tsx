import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { isSupabaseConfigured } from '../lib/supabase'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { session, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Graceful degradation: no redirect if Supabase not configured (demo mode)
    if (!isSupabaseConfigured) return
    if (loading) return
    if (!session) {
      navigate('/login', { replace: true })
    }
  }, [session, loading, navigate])

  // Demo mode: always render children
  if (!isSupabaseConfigured) return <>{children}</>

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return <>{children}</>
}
