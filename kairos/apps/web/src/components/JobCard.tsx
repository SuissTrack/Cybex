import { Clock, MapPin, Briefcase, AlertCircle } from 'lucide-react'
import type { Job } from '../lib/types'
import ScoreCircle from './ScoreCircle'
import clsx from 'clsx'

interface JobCardProps {
  job: Job
  index: number
  onClick: () => void
}

// Couleur dérivée du nom de l'entreprise (déterministe)
function companyColor(name: string | null): string {
  const colors = [
    '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
    '#D97706', '#059669', '#0891B2', '#4338CA',
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return '< 1h'
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}j`
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `${Math.round(n / 1000)}K`
  if (min && max) return `${fmt(min)}–${fmt(max)} CHF`
  if (min) return `dès ${fmt(min)} CHF`
  return `jusqu'à ${fmt(max!)} CHF`
}

export default function JobCard({ job, index, onClick }: JobCardProps) {
  const color = companyColor(job.company)
  const initial = (job.company?.[0] ?? job.title[0]).toUpperCase()
  const salary = formatSalary(job.salaryMin, job.salaryMax)
  const age = timeAgo(job.publishedAt)
  const isNew = job.publishedAt
    ? Date.now() - new Date(job.publishedAt).getTime() < 24 * 3_600_000
    : false

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={clsx(
        'job-card-enter bg-white rounded-xl border border-silk p-6',
        'cursor-pointer select-none',
        'hover:-translate-y-0.5 hover:shadow-3 hover:border-l-[3px]',
        'transition-all duration-200 ease-kairos',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-b'
      )}
      style={{
        animationDelay: `${index * 35}ms`,
        // Bordure gauche colorée au hover via CSS variable
        ['--hover-border-color' as string]: color,
      }}
      // Bordure gauche colorée dynamique
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderLeftColor = color
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderLeftColor = ''
      }}
    >
      <div className="flex gap-4">
        {/* Avatar entreprise */}
        <div
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-serif italic text-white text-base font-normal"
          style={{ backgroundColor: color + '20', color }}
        >
          {initial}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-ink-0 text-sm leading-snug truncate">{job.title}</h3>
              <p className="text-ink-50 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                {job.company && <span>{job.company}</span>}
                {job.company && job.location && <span className="text-ink-70">·</span>}
                {job.location && (
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {job.location}
                    {job.canton && `, ${job.canton}`}
                  </span>
                )}
                {job.workloadMin != null && (
                  <>
                    <span className="text-ink-70">·</span>
                    <span>{job.workloadMin}–{job.workloadMax}%</span>
                  </>
                )}
              </p>
            </div>

            <ScoreCircle score={job.matchScore} size={44} />
          </div>

          {/* Description tronquée */}
          {job.description && (
            <p className="text-xs text-ink-40 mt-2.5 truncate-2 leading-relaxed">
              {job.description}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.remote && (
              <Tag color="accent">Remote</Tag>
            )}
            {job.reportingObligation && (
              <Tag color="warning" icon={<AlertCircle size={10} />} title="Obligation d'annonce RAV — accès prioritaire 5 jours">
                Meldepflicht
              </Tag>
            )}
            {job.contractType && <Tag color="neutral">{job.contractType}</Tag>}
            {isNew && <Tag color="success">Nouveau</Tag>}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-mist text-xs text-ink-50">
            {salary && (
              <span className="font-mono font-semibold text-ink-30">{salary}</span>
            )}
            {job.contractType && !salary && (
              <span className="flex items-center gap-1">
                <Briefcase size={10} />
                {job.contractType}
              </span>
            )}
            {job.stellennummer && (
              <span className="font-mono text-ink-60">{job.stellennummer}</span>
            )}
            <span className="flex-1" />
            {age && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {age}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className={clsx(
                'text-xs font-semibold text-accent hover:text-accent-h',
                'transition-colors duration-150'
              )}
            >
              Détails →
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Tag sub-component ─────────────────────────────────────────────────────

interface TagProps {
  children: React.ReactNode
  color: 'accent' | 'neutral' | 'warning' | 'success' | 'error'
  icon?: React.ReactNode
  title?: string
}

function Tag({ children, color, icon, title }: TagProps) {
  const styles: Record<string, string> = {
    accent: 'bg-accent-m text-accent border-accent-b',
    neutral: 'bg-pearl text-ink-40 border-mist',
    warning: 'bg-warning-l text-warning border-warning/20',
    success: 'bg-success-l text-success border-success/20',
    error: 'bg-error-l text-error border-error/20',
  }
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium',
        styles[color]
      )}
    >
      {icon}
      {children}
    </span>
  )
}

import React from 'react'
