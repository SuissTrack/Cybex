import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, X, ChevronRight, ChevronLeft, Check, Briefcase } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import type { ContractType, WorkMode, LanguageSkill, Json } from '../lib/database.types'
import clsx from 'clsx'

// ─── Constants ──────────────────────────────────────────────────────────────

const SWISS_CANTONS = [
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR',
  'JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG',
  'TI','UR','VD','VS','ZG','ZH',
]

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Allemand' },
  { code: 'en', label: 'Anglais' },
  { code: 'it', label: 'Italien' },
  { code: 'es', label: 'Espagnol' },
  { code: 'pt', label: 'Portugais' },
  { code: 'ar', label: 'Arabe' },
]

const LANGUAGE_LEVELS = ['A1','A2','B1','B2','C1','C2','native'] as const

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'AUTRE', label: 'Autre' },
]

// ─── Step components ─────────────────────────────────────────────────────────

interface StepProps {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
}

interface OnboardingData {
  full_name: string
  city: string
  canton: string
  target_role: string
  languages: LanguageSkill[]
  contract_types: ContractType[]
  cvFile: File | null
  key_skills: string[]
  preferred_cantons: string[]
  workload_min: number
  workload_max: number
  salary_min: string
  work_mode: WorkMode | null
  email_alerts: boolean
}

// ── Step 1: Identité ─────────────────────────────────────────────────────────

function StepIdentity({ data, onChange }: StepProps) {
  const toggleLanguage = (code: string) => {
    const exists = data.languages.find((l) => l.code === code)
    if (exists) {
      onChange({ languages: data.languages.filter((l) => l.code !== code) })
    } else {
      onChange({ languages: [...data.languages, { code, level: 'B2' }] })
    }
  }

  const setLevel = (code: string, level: LanguageSkill['level']) => {
    onChange({
      languages: data.languages.map((l) => (l.code === code ? { ...l, level } : l)),
    })
  }

  const toggleContract = (ct: ContractType) => {
    if (data.contract_types.includes(ct)) {
      onChange({ contract_types: data.contract_types.filter((c) => c !== ct) })
    } else {
      onChange({ contract_types: [...data.contract_types, ct] })
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Nom complet *</label>
          <input
            type="text"
            value={data.full_name}
            onChange={(e) => onChange({ full_name: e.target.value })}
            placeholder="Jean Dupont"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Poste recherché *</label>
          <input
            type="text"
            value={data.target_role}
            onChange={(e) => onChange({ target_role: e.target.value })}
            placeholder="Développeur Full Stack"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Ville</label>
          <input
            type="text"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Genève"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Canton</label>
          <select
            value={data.canton}
            onChange={(e) => onChange({ canton: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Sélectionner…</option>
            {SWISS_CANTONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">Langues</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {LANGUAGES.map((lang) => {
            const active = data.languages.find((l) => l.code === lang.code)
            return (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                )}
              >
                {lang.label}
              </button>
            )
          })}
        </div>
        {data.languages.length > 0 && (
          <div className="space-y-2">
            {data.languages.map((lang) => {
              const label = LANGUAGES.find((l) => l.code === lang.code)?.label ?? lang.code
              return (
                <div key={lang.code} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-20">{label}</span>
                  <div className="flex gap-1">
                    {LANGUAGE_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lang.code, lvl)}
                        className={clsx(
                          'px-2 py-0.5 rounded text-xs transition-colors',
                          lang.level === lvl
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-800 text-gray-500 hover:text-white'
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">Types de contrat</label>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleContract(value)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                data.contract_types.includes(value)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 2: CV ───────────────────────────────────────────────────────────────

function StepCV({ data, onChange }: StepProps) {
  const [skillInput, setSkillInput] = useState('')

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onChange({ cvFile: accepted[0] })
    },
    [onChange]
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

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !data.key_skills.includes(s)) {
      onChange({ key_skills: [...data.key_skills, s] })
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    onChange({ key_skills: data.key_skills.filter((s) => s !== skill) })
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Votre CV (PDF ou DOCX, max 5 Mo)</label>
        {data.cvFile ? (
          <div className="flex items-center gap-3 bg-gray-800 border border-indigo-500/50 rounded-xl px-4 py-3">
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{data.cvFile.name}</p>
              <p className="text-xs text-gray-400">
                {(data.cvFile.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            </div>
            <button
              onClick={() => onChange({ cvFile: null })}
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-gray-700 hover:border-gray-600'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-300">
              {isDragActive ? 'Déposez ici…' : 'Glissez votre CV ici, ou cliquez pour parcourir'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF ou DOCX · max 5 Mo</p>
          </div>
        )}
      </div>

      {/* AI analysis placeholder */}
      <div className="bg-indigo-900/20 border border-indigo-800/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <p className="text-xs font-medium text-indigo-300">Analyse IA — Phase 4</p>
        </div>
        <p className="text-xs text-gray-400">
          L'analyse automatique de votre CV et le calcul du score de compatibilité seront
          disponibles dans une prochaine version.
        </p>
      </div>

      {/* Manual skills */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">
          Compétences clés (saisie manuelle)
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            placeholder="Ex: React, Python, Gestion de projet…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={addSkill}
            disabled={!skillInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            Ajouter
          </button>
        </div>
        {data.key_skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.key_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full"
              >
                {skill}
                <button onClick={() => removeSkill(skill)} className="text-gray-500 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 3: Préférences ───────────────────────────────────────────────────────

function StepPreferences({ data, onChange }: StepProps) {
  const toggleCanton = (c: string) => {
    if (data.preferred_cantons.includes(c)) {
      onChange({ preferred_cantons: data.preferred_cantons.filter((x) => x !== c) })
    } else {
      onChange({ preferred_cantons: [...data.preferred_cantons, c] })
    }
  }

  const WORK_MODES: { value: WorkMode; label: string }[] = [
    { value: 'ONSITE', label: 'Sur site' },
    { value: 'HYBRID', label: 'Hybride' },
    { value: 'REMOTE', label: 'Télétravail' },
  ]

  return (
    <div className="space-y-6">
      {/* Cantons */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Cantons préférés</label>
        <div className="flex flex-wrap gap-1.5">
          {SWISS_CANTONS.map((c) => (
            <button
              key={c}
              onClick={() => toggleCanton(c)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                data.preferred_cantons.includes(c)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Taux d'activité */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">
          Taux d'activité :{' '}
          <span className="text-white">
            {data.workload_min}% – {data.workload_max}%
          </span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0} max={100} step={10}
            value={data.workload_min}
            onChange={(e) => onChange({ workload_min: Number(e.target.value) })}
            className="flex-1 accent-indigo-600"
          />
          <span className="text-xs text-gray-500 w-4">–</span>
          <input
            type="range"
            min={0} max={100} step={10}
            value={data.workload_max}
            onChange={(e) => onChange({ workload_max: Number(e.target.value) })}
            className="flex-1 accent-indigo-600"
          />
        </div>
      </div>

      {/* Salaire min */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Salaire minimum (CHF/an, optionnel)</label>
        <input
          type="number"
          value={data.salary_min}
          onChange={(e) => onChange({ salary_min: e.target.value })}
          placeholder="Ex: 80000"
          min={0}
          step={1000}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Mode de travail */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Mode de travail</label>
        <div className="flex gap-2">
          {WORK_MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ work_mode: data.work_mode === value ? null : value })}
              className={clsx(
                'flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors border',
                data.work_mode === value
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alertes email */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm text-white">Alertes email quotidiennes</p>
          <p className="text-xs text-gray-400">Recevez les nouvelles offres correspondant à votre profil</p>
        </div>
        <button
          onClick={() => onChange({ email_alerts: !data.email_alerts })}
          className={clsx(
            'w-11 h-6 rounded-full transition-colors relative',
            data.email_alerts ? 'bg-indigo-600' : 'bg-gray-700'
          )}
        >
          <span
            className={clsx(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
              data.email_alerts && 'translate-x-5'
            )}
          />
        </button>
      </div>
    </div>
  )
}

// ─── Main Onboarding component ────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Identité', description: 'Votre profil de base' },
  { id: 2, title: 'Votre CV', description: 'Compétences et expériences' },
  { id: 3, title: 'Préférences', description: 'Critères de recherche' },
]

const INITIAL_DATA: OnboardingData = {
  full_name: '',
  city: '',
  canton: '',
  target_role: '',
  languages: [],
  contract_types: [],
  cvFile: null,
  key_skills: [],
  preferred_cantons: [],
  workload_min: 80,
  workload_max: 100,
  salary_min: '',
  work_mode: null,
  email_alerts: true,
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { session, updateProfile } = useAuthStore()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = (patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }

  const handleNext = () => {
    if (step < STEPS.length) setStep((s) => s + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleFinish = async () => {
    if (!session?.user) return
    setSaving(true)
    setError(null)

    try {
      // Upload CV if provided
      let cv_url: string | null = null
      if (data.cvFile) {
        const ext = data.cvFile.name.endsWith('.docx') ? 'docx' : 'pdf'
        const path = `cvs/${session.user.id}/cv.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('cvs')
          .upload(path, data.cvFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(path)
        cv_url = urlData.publicUrl
      }

      await updateProfile({
        full_name: data.full_name || null,
        city: data.city || null,
        canton: data.canton || null,
        target_role: data.target_role || null,
        languages: data.languages as unknown as Json,
        contract_types: data.contract_types,
        key_skills: data.key_skills,
        preferred_cantons: data.preferred_cantons,
        workload_min: data.workload_min,
        workload_max: data.workload_max,
        salary_min: data.salary_min ? Number(data.salary_min) : null,
        work_mode: data.work_mode,
        email_alerts: data.email_alerts,
        cv_url,
        onboarding_done: true,
      })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Configuration du profil</h1>
            <p className="text-xs text-gray-400">Étape {step} sur {STEPS.length}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1">
              <div
                className={clsx(
                  'h-1 rounded-full transition-colors',
                  s.id < step
                    ? 'bg-indigo-600'
                    : s.id === step
                    ? 'bg-indigo-500'
                    : 'bg-gray-800'
                )}
              />
              <p className={clsx('text-xs mt-1.5', s.id === step ? 'text-white' : 'text-gray-600')}>
                {s.title}
              </p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-base font-semibold text-white mb-1">
            {STEPS[step - 1].title}
          </h2>
          <p className="text-xs text-gray-400 mb-6">{STEPS[step - 1].description}</p>

          {step === 1 && <StepIdentity data={data} onChange={onChange} />}
          {step === 2 && <StepCV data={data} onChange={onChange} />}
          {step === 3 && <StepPreferences data={data} onChange={onChange} />}

          {error && (
            <p className="mt-4 text-xs text-red-400">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>

            {step < STEPS.length ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Terminer'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <p className="text-center mt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-gray-600 hover:text-gray-400 underline underline-offset-2"
          >
            Ignorer pour l'instant
          </button>
        </p>
      </div>
    </div>
  )
}
