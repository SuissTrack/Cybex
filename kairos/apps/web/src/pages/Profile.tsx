import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  User, Upload, X, Save, LogOut, FileText, Briefcase, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import type { Profile as ProfileType } from '../lib/database.types'
import clsx from 'clsx'

export default function Profile() {
  const navigate = useNavigate()
  const { session, profile, updateProfile, signOut } = useAuthStore()

  const [form, setForm] = useState<Partial<ProfileType>>(profile ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingCv, setUploadingCv] = useState(false)

  const patch = (data: Partial<ProfileType>) => setForm((f) => ({ ...f, ...data }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateProfile(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0]
      if (!file || !session?.user) return
      setUploadingCv(true)
      setError(null)
      try {
        const ext = file.name.endsWith('.docx') ? 'docx' : 'pdf'
        const path = `cvs/${session.user.id}/cv.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('cvs')
          .upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(path)
        await updateProfile({ cv_url: urlData.publicUrl })
        patch({ cv_url: urlData.publicUrl })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur upload CV')
      } finally {
        setUploadingCv(false)
      }
    },
    [session, updateProfile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  })

  const email = session?.user?.email ?? '—'

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour au tableau de bord
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-700 rounded-2xl flex items-center justify-center">
              <User className="w-7 h-7 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {profile?.full_name ?? 'Mon profil'}
              </h1>
              <p className="text-sm text-gray-400">{email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-800 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>

        {/* Credits */}
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-6">
          <Briefcase className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-gray-300">
            Crédits disponibles :{' '}
            <strong className="text-white">{profile?.credits ?? 0}</strong>
          </span>
        </div>

        {/* Identity section */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-white mb-4">Informations personnelles</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nom complet</label>
              <input
                type="text"
                value={form.full_name ?? ''}
                onChange={(e) => patch({ full_name: e.target.value || null })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Poste recherché</label>
              <input
                type="text"
                value={form.target_role ?? ''}
                onChange={(e) => patch({ target_role: e.target.value || null })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Ville</label>
              <input
                type="text"
                value={form.city ?? ''}
                onChange={(e) => patch({ city: e.target.value || null })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Canton</label>
              <input
                type="text"
                value={form.canton ?? ''}
                onChange={(e) => patch({ canton: e.target.value || null })}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </section>

        {/* CV section */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-white mb-4">CV</h2>

          {form.cv_url ? (
            <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 mb-3">
              <FileText className="w-4 h-4 text-indigo-400" />
              <a
                href={form.cv_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-sm text-indigo-300 hover:text-indigo-200 underline underline-offset-2 truncate"
              >
                Voir le CV actuel
              </a>
              <button
                onClick={() => { updateProfile({ cv_url: null }); patch({ cv_url: null }) }}
                className="text-gray-500 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-gray-700 hover:border-gray-600'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {uploadingCv
                ? 'Upload en cours…'
                : isDragActive
                ? 'Déposez ici…'
                : form.cv_url
                ? 'Remplacer le CV (PDF/DOCX · max 5 Mo)'
                : 'Déposer votre CV (PDF/DOCX · max 5 Mo)'}
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors',
              saved
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
            )}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé !' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
