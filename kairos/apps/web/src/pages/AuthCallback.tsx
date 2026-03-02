import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      navigate('/dashboard', { replace: true })
      return
    }

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const token_hash = params.get('token_hash')
      const type = params.get('type')
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')

      // Supabase peut renvoyer une erreur dans l'URL
      if (errorParam) {
        setError(errorDescription ?? errorParam)
        return
      }

      let session = null

      if (code) {
        // OAuth PKCE (Google)
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )
        if (error) { setError(error.message); return }
        session = data.session

      } else if (token_hash && type) {
        // Magic link (email OTP)
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'email' | 'recovery' | 'invite' | 'email_change',
        })
        if (error) { setError(error.message); return }
        session = data.session

      } else {
        // Hash fragment (#access_token=...) — ancien format Supabase
        // Le client Supabase le gère automatiquement via onAuthStateChange
        const { data } = await supabase.auth.getSession()
        session = data.session
      }

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      await refreshProfile()

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', session.user.id)
        .single()

      if (profile?.onboarding_done) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, refreshProfile])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 gap-4">
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="text-indigo-400 text-sm hover:text-indigo-300"
        >
          Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Connexion en cours…</p>
      </div>
    </div>
  )
}
