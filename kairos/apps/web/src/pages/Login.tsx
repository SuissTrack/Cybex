import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Mail, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle, session } = useAuthStore()

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already logged in
  if (session) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Kairos</span>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h1 className="text-xl font-semibold text-white mb-2">Connexion</h1>
          <p className="text-sm text-gray-400 mb-6">
            Accédez à votre espace emploi personnalisé
          </p>

          {/* Supabase not configured banner */}
          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-amber-900/30 border border-amber-700/50 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">Supabase non configuré</p>
                <p className="text-xs text-amber-400/80 mt-1">
                  Copiez <code className="bg-amber-900/50 px-1 rounded">.env.example</code> vers{' '}
                  <code className="bg-amber-900/50 px-1 rounded">.env</code> et renseignez vos clés
                  Supabase pour activer l'authentification.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-2 text-xs text-amber-300 underline underline-offset-2"
                >
                  Continuer en mode démo →
                </button>
              </div>
            </div>
          )}

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="text-white font-medium text-center">Lien envoyé !</p>
              <p className="text-sm text-gray-400 text-center">
                Vérifiez votre boîte mail à <strong className="text-white">{email}</strong> et
                cliquez sur le lien magique pour vous connecter.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                onClick={handleGoogle}
                disabled={!isSupabaseConfigured || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuer avec Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-xs text-gray-500">ou</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>

              {/* Magic link */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.ch"
                    required
                    disabled={!isSupabaseConfigured || loading}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isSupabaseConfigured || loading || !email.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours…' : 'Recevoir un lien magique'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          En vous connectant, vous acceptez nos conditions d'utilisation.
        </p>
      </div>
    </div>
  )
}
