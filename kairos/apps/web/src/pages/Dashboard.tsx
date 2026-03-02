import { useEffect, useState } from 'react'
import { useJobStore } from '../stores/jobStore'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import JobCard from '../components/JobCard'
import JobDetail from '../components/JobDetail'
import type { Job } from '../lib/types'
import clsx from 'clsx'

type QuickFilter = 'all' | 'top' | 'remote' | 'new'

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'top', label: 'Top match (≥88)' },
  { id: 'remote', label: 'Remote' },
  { id: 'new', label: 'Nouvelles (24h)' },
]

function applyQuickFilter(jobs: Job[], filter: QuickFilter): Job[] {
  switch (filter) {
    case 'top':
      return jobs.filter((j) => j.matchScore !== null && j.matchScore >= 88)
    case 'remote':
      return jobs.filter((j) => j.remote)
    case 'new':
      return jobs.filter(
        (j) => j.publishedAt && Date.now() - new Date(j.publishedAt).getTime() < 24 * 3_600_000
      )
    default:
      return jobs
  }
}

export default function Dashboard() {
  const { jobs, total, status, isDemo, error, search, checkConnection, selectJob, selectedJob } = useJobStore()
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  // Au montage : vérifier connexion puis lancer une recherche initiale
  useEffect(() => {
    void (async () => {
      await checkConnection()
      await search()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayedJobs = applyQuickFilter(jobs, quickFilter)

  return (
    <div className="flex flex-col h-screen bg-snow">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Zone principale */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-5">

            {/* Banner mode démo */}
            {isDemo && (
              <div className="mb-4 bg-warning-l border border-warning/20 rounded-lg px-4 py-3 text-sm text-warning flex items-start gap-3">
                <span className="shrink-0 text-base">⚠️</span>
                <div>
                  <p className="font-semibold">Mode démo actif</p>
                  <p className="text-xs text-ink-40 mt-0.5">
                    Le proxy job-room.ch n'est pas accessible. Les offres affichées sont des données de démonstration.
                    {error && <> · Erreur : <code className="font-mono text-xs">{error}</code></>}
                  </p>
                </div>
              </div>
            )}

            {/* Quick filters */}
            <div className="flex items-center gap-1.5 mb-5">
              {QUICK_FILTERS.map((qf) => {
                const count = applyQuickFilter(jobs, qf.id).length
                return (
                  <button
                    key={qf.id}
                    onClick={() => setQuickFilter(qf.id)}
                    className={clsx(
                      'flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full border',
                      'font-medium transition-all duration-150',
                      quickFilter === qf.id
                        ? 'bg-ink-0 text-white border-ink-0'
                        : 'bg-white text-ink-40 border-silk hover:border-ink-40'
                    )}
                  >
                    {qf.label}
                    {jobs.length > 0 && (
                      <span
                        className={clsx(
                          'text-xs font-mono px-1.5 py-0.5 rounded-full',
                          quickFilter === qf.id ? 'bg-white/20 text-white' : 'bg-pearl text-ink-50'
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}

              <span className="ml-auto text-xs text-ink-50">
                {displayedJobs.length} offre{displayedJobs.length !== 1 ? 's' : ''}
                {total > jobs.length && ` · ${total.toLocaleString('fr-CH')} au total`}
              </span>
            </div>

            {/* States */}
            {status === 'loading' && <LoadingSkeleton />}

            {status !== 'loading' && displayedJobs.length === 0 && (
              <EmptyState quickFilter={quickFilter} onReset={() => setQuickFilter('all')} />
            )}

            {/* Job list */}
            {status !== 'loading' && displayedJobs.length > 0 && (
              <div className="flex flex-col gap-3">
                {displayedJobs.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    onClick={() => selectJob(job)}
                  />
                ))}
              </div>
            )}

            {/* Pagination hint */}
            {status === 'success' && total > jobs.length && (
              <div className="mt-6 text-center">
                <p className="text-xs text-ink-50 mb-2">
                  {jobs.length} offres chargées sur {total.toLocaleString('fr-CH')}
                </p>
                <button className="text-sm font-medium text-accent hover:text-accent-h transition-colors duration-150">
                  Charger la suite →
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Job detail panel */}
      {selectedJob && (
        <JobDetail job={selectedJob} onClose={() => selectJob(null)} />
      )}
    </div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-silk p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg skeleton shrink-0" />
            <div className="flex-1">
              <div className="skeleton h-4 rounded w-2/3 mb-2" />
              <div className="skeleton h-3 rounded w-1/3 mb-4" />
              <div className="skeleton h-3 rounded w-full mb-1.5" />
              <div className="skeleton h-3 rounded w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ quickFilter, onReset }: { quickFilter: QuickFilter; onReset: () => void }) {
  const isFiltered = quickFilter !== 'all'
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-4">🔍</div>
      <h3 className="font-serif italic text-xl text-ink-0 mb-2">
        {isFiltered ? 'Aucune offre dans ce filtre' : 'Aucune offre trouvée'}
      </h3>
      <p className="text-sm text-ink-50 max-w-xs">
        {isFiltered
          ? 'Essayez un autre filtre ou élargissez vos critères de recherche.'
          : 'Modifiez vos filtres dans la barre latérale pour trouver des offres correspondant à votre profil.'}
      </p>
      {isFiltered && (
        <button
          onClick={onReset}
          className="mt-4 text-sm font-medium text-accent hover:text-accent-h transition-colors"
        >
          Voir toutes les offres
        </button>
      )}
    </div>
  )
}
