import { Search } from 'lucide-react'
import { useJobStore } from '../stores/jobStore'
import type { ContractType } from '../lib/types'
import clsx from 'clsx'

const CANTONS = [
  { code: 'ZH', name: 'Zurich' },
  { code: 'GE', name: 'Genève' },
  { code: 'VD', name: 'Vaud' },
  { code: 'BE', name: 'Berne' },
  { code: 'BS', name: 'Bâle' },
  { code: 'AG', name: 'Argovie' },
  { code: 'LU', name: 'Lucerne' },
  { code: 'TI', name: 'Tessin' },
  { code: 'SG', name: 'St-Gall' },
  { code: 'FR', name: 'Fribourg' },
]

const MORE_CANTONS = [
  { code: 'VS', name: 'Valais' },
  { code: 'NE', name: 'Neuchâtel' },
  { code: 'SO', name: 'Soleure' },
  { code: 'TG', name: 'Thurgovie' },
  { code: 'GR', name: 'Grisons' },
  { code: 'ZG', name: 'Zoug' },
  { code: 'BL', name: 'Bâle-Camp.' },
  { code: 'SH', name: 'Schaffhouse' },
  { code: 'JU', name: 'Jura' },
  { code: 'NW', name: 'Nidwald' },
  { code: 'OW', name: 'Obwald' },
  { code: 'UR', name: 'Uri' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'GL', name: 'Glaris' },
  { code: 'AI', name: 'App. Rh.-Int.' },
  { code: 'AR', name: 'App. Rh.-Ext.' },
]

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'FREELANCE', label: 'Freelance' },
]

const DATE_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7j' },
  { value: 14, label: '14j' },
  { value: 30, label: '30j' },
]

export default function Sidebar() {
  const { filters, setFilter, search, status } = useJobStore()
  const [showMoreCantons, setShowMoreCantons] = React.useState(false)

  const allCantons = showMoreCantons ? [...CANTONS, ...MORE_CANTONS] : CANTONS

  const toggleCanton = (code: string) => {
    const current = filters.cantons
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    setFilter('cantons', next)
  }

  const toggleContract = (val: ContractType) => {
    const current = filters.contractTypes
    const next = current.includes(val) ? current.filter((c) => c !== val) : [...current, val]
    setFilter('contractTypes', next)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void search()
  }

  return (
    <aside className="w-[290px] shrink-0 bg-white border-r border-silk overflow-y-auto flex flex-col">
      <form onSubmit={handleSearch} className="flex-1 p-5 flex flex-col gap-5">

        {/* Recherche libre */}
        <div>
          <label className="block text-xs font-semibold text-ink-30 uppercase tracking-widest mb-2">
            Poste / entreprise
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-50" />
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilter('keyword', e.target.value)}
              placeholder="Développeur, UX, Data…"
              className={clsx(
                'w-full pl-9 pr-3 py-2 text-sm border border-silk rounded-md',
                'bg-snow placeholder:text-ink-50 text-ink-10',
                'focus:outline-none focus:border-accent-b focus:ring-1 focus:ring-accent-b',
                'transition-colors duration-150'
              )}
            />
          </div>
        </div>

        {/* Cantons */}
        <div>
          <label className="block text-xs font-semibold text-ink-30 uppercase tracking-widest mb-2">
            Cantons
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allCantons.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleCanton(c.code)}
                className={clsx(
                  'text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150',
                  filters.cantons.includes(c.code)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-30 border-silk hover:border-accent-b hover:text-accent'
                )}
              >
                {c.code}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMoreCantons((v) => !v)}
              className="text-xs px-2.5 py-1 rounded-full border border-silk text-ink-50 hover:border-ink-60 transition-colors duration-150"
            >
              {showMoreCantons ? '−moins' : '+16'}
            </button>
          </div>
        </div>

        {/* Période */}
        <div>
          <label className="block text-xs font-semibold text-ink-30 uppercase tracking-widest mb-2">
            Publiées dans les
          </label>
          <div className="flex gap-1.5">
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter('onlineSinceDays', opt.value)}
                className={clsx(
                  'flex-1 text-xs py-1.5 rounded-md border font-medium transition-all duration-150',
                  filters.onlineSinceDays === opt.value
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-30 border-silk hover:border-accent-b'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type de contrat */}
        <div>
          <label className="block text-xs font-semibold text-ink-30 uppercase tracking-widest mb-2">
            Contrat
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CONTRACT_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => toggleContract(ct.value)}
                className={clsx(
                  'text-xs px-3 py-1.5 rounded-md border font-medium transition-all duration-150',
                  filters.contractTypes.includes(ct.value)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-30 border-silk hover:border-accent-b'
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Taux d'activité */}
        <div>
          <label className="block text-xs font-semibold text-ink-30 uppercase tracking-widest mb-2">
            Taux d&apos;activité
          </label>
          <div className="flex gap-1.5">
            {[50, 80, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setFilter('workloadMin', pct === 50 ? 40 : pct === 80 ? 70 : 90)}
                className={clsx(
                  'flex-1 text-xs py-1.5 rounded-md border font-medium transition-all duration-150',
                  (pct === 50 && filters.workloadMin >= 40 && filters.workloadMin < 70) ||
                  (pct === 80 && filters.workloadMin >= 70 && filters.workloadMin < 90) ||
                  (pct === 100 && filters.workloadMin >= 90)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-30 border-silk hover:border-accent-b'
                )}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Mode de travail */}
        <div>
          <label className="block text-xs font-semibold text-ink-30 uppercase tracking-widest mb-2">
            Mode de travail
          </label>
          <div className="flex gap-1.5">
            {([null, false, true] as const).map((val) => {
              const labels: Record<string, string> = { null: 'Tous', false: 'Sur site', true: 'Remote' }
              const key = String(val)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter('remote', val)}
                  className={clsx(
                    'flex-1 text-xs py-1.5 rounded-md border font-medium transition-all duration-150',
                    filters.remote === val
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink-30 border-silk hover:border-accent-b'
                  )}
                >
                  {labels[key]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bouton recherche */}
        <button
          type="submit"
          disabled={status === 'loading'}
          className={clsx(
            'w-full py-2.5 rounded-md text-sm font-semibold',
            'bg-accent text-white hover:bg-accent-h',
            'shadow-1 hover:shadow-2 hover:-translate-y-px',
            'transition-all duration-150 ease-kairos',
            status === 'loading' && 'opacity-60 cursor-not-allowed'
          )}
        >
          {status === 'loading' ? 'Recherche…' : 'Rechercher'}
        </button>

        {/* Source info */}
        <div className="mt-auto pt-4 border-t border-mist">
          <div className="bg-pearl rounded-lg p-3 text-xs text-ink-40 leading-relaxed">
            <p className="font-semibold text-ink-30 mb-1">🇨🇭 job-room.ch</p>
            <p>Source officielle SECO — toutes les offres d&apos;emploi suisses déclarées.</p>
          </div>
        </div>

      </form>
    </aside>
  )
}

// Import React for useState
import React from 'react'
