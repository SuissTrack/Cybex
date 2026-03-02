import { X, ExternalLink, MapPin, Calendar, AlertCircle, Globe } from 'lucide-react'
import type { Job } from '../lib/types'
import ScoreCircle from './ScoreCircle'
import clsx from 'clsx'

interface JobDetailProps {
  job: Job
  onClose: () => void
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return 'Selon profil'
  const fmt = (n: number) => `${Math.round(n / 1000)}K`
  if (min && max) return `${fmt(min)}–${fmt(max)} CHF`
  if (min) return `dès ${fmt(min)} CHF`
  return `jusqu'à ${fmt(max!)} CHF`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(dateStr)
  )
}

export default function JobDetail({ job, onClose }: JobDetailProps) {
  // Fermer sur Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-0/20 backdrop-blur-sm z-30 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={clsx(
          'fixed right-0 top-0 h-full w-[560px] bg-white z-40',
          'shadow-5 border-l border-silk overflow-y-auto',
          'flex flex-col'
        )}
        style={{ animation: 'slide-panel 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both' }}
      >
        <style>{`
          @keyframes slide-panel {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header panel */}
        <div className="sticky top-0 bg-white border-b border-mist px-8 py-5 flex items-start gap-4 z-10">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-serif italic text-xl"
            style={{
              backgroundColor: '#2563EB20',
              color: '#2563EB',
            }}
          >
            {(job.company?.[0] ?? job.title[0]).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-serif italic text-ink-0 text-xl leading-snug">{job.title}</h2>
            <p className="text-sm text-ink-40 mt-1 flex items-center gap-2 flex-wrap">
              {job.company && <strong className="text-ink-20 font-medium">{job.company}</strong>}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {job.location}{job.canton ? `, ${job.canton}` : ''}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ScoreCircle score={job.matchScore} size={52} />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-silk flex items-center justify-center text-ink-50 hover:text-ink-10 hover:bg-pearl transition-colors duration-150"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-8 py-6 flex flex-col gap-6">

          {/* Meta tags */}
          <div className="flex flex-wrap gap-2">
            <MetaTag icon={<Calendar size={12} />}>
              Publiée le {formatDate(job.publishedAt)}
            </MetaTag>
            {job.contractType && (
              <MetaTag>
                {job.contractType}
              </MetaTag>
            )}
            {job.workloadMin != null && (
              <MetaTag>
                {job.workloadMin}–{job.workloadMax}% activité
              </MetaTag>
            )}
            <MetaTag>
              {formatSalary(job.salaryMin, job.salaryMax)}
            </MetaTag>
            {job.remote && (
              <MetaTag color="accent">
                Remote / Hybride
              </MetaTag>
            )}
            {job.stellennummer && (
              <span className="text-xs font-mono text-ink-50 px-2.5 py-1 border border-mist rounded-full">
                {job.stellennummer}
              </span>
            )}
          </div>

          {/* Obligation d'annonce */}
          {job.reportingObligation && (
            <div className="bg-warning-l border border-warning/20 rounded-lg px-4 py-3 flex gap-3 text-sm">
              <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">Meldepflicht — Obligation d'annonce</p>
                <p className="text-ink-40 text-xs mt-0.5 leading-relaxed">
                  Cette offre est soumise à l'obligation d'annonce SECO. Les demandeurs inscrits au RAV/ORP ont un accès prioritaire pendant 5 jours ouvrables.
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <Section title="Description du poste">
              <div
                className="text-sm text-ink-30 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitize(job.description) }}
              />
            </Section>
          )}

          {/* Requirements */}
          {job.requirements && (
            <Section title="Compétences requises">
              <p className="text-sm text-ink-30 leading-relaxed">{job.requirements}</p>
            </Section>
          )}

          {/* Langues */}
          {job.languagesRequired.length > 0 && (
            <Section title="Langues requises">
              <div className="flex gap-2 flex-wrap">
                {job.languagesRequired.map((lang) => (
                  <span
                    key={lang}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-pearl rounded-full text-ink-30"
                  >
                    <Globe size={11} />
                    {lang}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Score détail — Phase 4 (IA) */}
          {job.matchScore !== null && (
            <Section title="Compatibilité avec votre profil">
              <div className="space-y-2.5">
                {[
                  { label: 'Compétences', weight: 35 },
                  { label: 'Expérience', weight: 20 },
                  { label: 'Localisation', weight: 15 },
                  { label: 'Langues', weight: 15 },
                  { label: 'Rémunération', weight: 10 },
                  { label: 'Type de contrat', weight: 5 },
                ].map(({ label, weight }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-ink-40 w-32 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-pearl rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, job.matchScore! * (weight / 35))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-ink-40 w-8 text-right">{weight}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-50 mt-3">
                * Scoring détaillé disponible avec l'analyse IA (Phase 4)
              </p>
            </Section>
          )}
        </div>

        {/* Actions footer */}
        <div className="sticky bottom-0 bg-white border-t border-mist px-8 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-silk text-sm font-medium text-ink-30 hover:bg-pearl transition-colors duration-150"
          >
            Fermer
          </button>
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-silk text-sm font-medium text-ink-30 hover:bg-pearl transition-colors duration-150"
            >
              <ExternalLink size={14} />
              Voir sur job-room.ch
            </a>
          )}
          <button
            className={clsx(
              'flex-1 py-2.5 rounded-lg text-sm font-semibold',
              'bg-accent text-white hover:bg-accent-h',
              'shadow-1 hover:shadow-2 hover:-translate-y-px',
              'transition-all duration-150 ease-kairos'
            )}
          >
            Postuler →
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-30 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function MetaTag({ children, icon, color = 'neutral' }: {
  children: React.ReactNode
  icon?: React.ReactNode
  color?: 'neutral' | 'accent'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border',
        color === 'accent'
          ? 'bg-accent-m text-accent border-accent-b'
          : 'bg-pearl text-ink-40 border-mist'
      )}
    >
      {icon}
      {children}
    </span>
  )
}

// Sanitize HTML minimal (évite XSS basique)
function sanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
}

import React from 'react'
