'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import {
  MapPin, Building2, Wifi, Send, RefreshCw, ExternalLink,
  Sparkles, CheckCircle2, XCircle, AlertCircle, ChevronRight, Pencil, Zap, X, Layers,
} from 'lucide-react';

interface Job {
  id: string; title: string; company: string; location?: string;
  isRemote: boolean; contractType: string; salaryMin?: number;
  salaryMax?: number; currency: string; source: string; skills: string[];
  postedAt?: string; applyUrl: string; aiSummary?: string; matchScore?: number;
  description?: string;
}

interface AtsAnalysis {
  score: number; strengths: string[]; gaps: string[]; suggestions: string[]; verdict: string;
}

interface PreparedApplication {
  id: string; status: string; coverLetter?: string;
  customAnswers?: { ats?: AtsAnalysis };
  job: { id: string; title: string; company: string; applyUrl: string };
}

interface JobMatch {
  jobId: string; score: number; reason: string;
}

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: 'LinkedIn', INDEED: 'Indeed', JOBSCH: 'jobs.ch',
  JOBUPCH: 'jobup.ch', WELCOME_TO_THE_JUNGLE: 'WTTJ',
};
const SOURCE_COLORS: Record<string, string> = {
  LINKEDIN: 'bg-blue-500/10 text-blue-600', INDEED: 'bg-purple-500/10 text-purple-600',
  JOBSCH: 'bg-red-500/10 text-red-600', JOBUPCH: 'bg-orange-500/10 text-orange-600',
  WELCOME_TO_THE_JUNGLE: 'bg-green-500/10 text-green-600',
};

export default function JobsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [preparedApp, setPreparedApp] = useState<PreparedApplication | null>(null);
  const [preparingJobId, setPreparingJobId] = useState<string | null>(null);

  // Smart Match state
  const [smartMatchMode, setSmartMatchMode] = useState(false);
  const [smartMatches, setSmartMatches] = useState<Record<string, JobMatch>>({});

  // Bulk apply modal state
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { data, isLoading } = useQuery(['jobs', search, sourceFilter, remoteOnly, page], () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('q', search);
    if (sourceFilter) params.set('source', sourceFilter);
    if (remoteOnly) params.set('remote', 'true');
    return api.get<{ jobs: Job[]; pagination: { total: number; pages: number } }>(`/jobs?${params}`).then((r) => r.data);
  });

  const scrapeMutation = useMutation(() => api.post('/automation/scrape', {}), {
    onSuccess: () => {
      toast({ title: 'Scraping lancé', description: 'Les nouvelles offres arrivent dans quelques minutes.' });
      setTimeout(() => queryClient.invalidateQueries('jobs'), 10000);
    },
  });

  const prepareMutation = useMutation(
    (jobId: string) => api.post<PreparedApplication>('/applications', { jobId }).then((r) => r.data),
    {
      onMutate: (jobId) => setPreparingJobId(jobId),
      onSuccess: (app) => { setPreparedApp(app); setPreparingJobId(null); queryClient.invalidateQueries('applications'); },
      onError: (err: unknown) => {
        setPreparingJobId(null);
        toast({
          variant: 'destructive', title: 'Erreur',
          description: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Impossible de préparer la candidature.',
        });
      },
    },
  );

  // Smart Match mutation — sends current page's job IDs for batch analysis
  const smartMatchMutation = useMutation(
    () => {
      const jobIds = data?.jobs.map((j) => j.id) ?? [];
      return api.post<{ matches: JobMatch[] }>('/jobs/smart-match', { jobIds }).then((r) => r.data);
    },
    {
      onSuccess: ({ matches }) => {
        const map: Record<string, JobMatch> = {};
        matches.forEach((m) => { map[m.jobId] = m; });
        setSmartMatches(map);
        setSmartMatchMode(true);
        const topCount = matches.filter((m) => m.score >= 70).length;
        toast({
          title: `✨ Smart Match terminé`,
          description: `${matches.length} offres analysées — ${topCount} fort${topCount > 1 ? 's' : ''} match${topCount > 1 ? 's' : ''} trouvé${topCount > 1 ? 's' : ''}.`,
        });
      },
      onError: (err: unknown) => {
        toast({
          variant: 'destructive',
          title: 'Smart Match indisponible',
          description:
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Erreur lors de l\'analyse. Vérifiez vos crédits Anthropic.',
        });
      },
    },
  );

  const exitSmartMatch = () => { setSmartMatchMode(false); setSmartMatches({}); setShowBulkModal(false); };

  // In smart match mode, sort jobs by AI score (highest first)
  const displayedJobs = smartMatchMode && Object.keys(smartMatches).length
    ? [...(data?.jobs ?? [])].sort((a, b) => {
        const sa = smartMatches[a.id]?.score ?? -1;
        const sb = smartMatches[b.id]?.score ?? -1;
        return sb - sa;
      })
    : (data?.jobs ?? []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offres d&apos;emploi</h1>
          <p className="text-muted-foreground">
            {smartMatchMode
              ? `${displayedJobs.length} offres classées par compatibilité IA`
              : `${data?.pagination.total ?? 0} offres trouvées`}
          </p>
        </div>
        <Button variant="outline" onClick={() => scrapeMutation.mutate()} disabled={scrapeMutation.isLoading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${scrapeMutation.isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button
          variant={remoteOnly ? 'default' : 'outline'}
          onClick={() => { setRemoteOnly(!remoteOnly); setPage(1); }}
          className="gap-2" size="sm"
        >
          <Wifi className="w-4 h-4" /> Remote
        </Button>

        {/* Smart Match button */}
        {smartMatchMode ? (
          <Button
            variant="default"
            size="sm"
            onClick={exitSmartMatch}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            <Zap className="w-4 h-4" />
            Smart Match actif
            <X className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => smartMatchMutation.mutate()}
            disabled={smartMatchMutation.isLoading || isLoading || !data?.jobs.length}
            className="gap-2 border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-violet-400 dark:border-violet-700 dark:hover:bg-violet-950"
          >
            <Zap className="w-4 h-4" />
            {smartMatchMutation.isLoading ? 'Analyse en cours…' : 'Smart Match IA'}
          </Button>
        )}
      </div>

      {/* Smart Match active banner */}
      {smartMatchMode && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-500/5 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-400 min-w-0">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Smart Match IA</strong> — {Object.keys(smartMatches).length} offres analysées,{' '}
              {Object.values(smartMatches).filter((m) => m.score >= 70).length} fort{Object.values(smartMatches).filter((m) => m.score >= 70).length !== 1 ? 's' : ''} match{Object.values(smartMatches).filter((m) => m.score >= 70).length !== 1 ? 's' : ''}.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white border-0"
              onClick={() => setShowBulkModal(true)}
            >
              <Layers className="w-3.5 h-3.5" />
              Postuler en masse
            </Button>
            <button onClick={exitSmartMatch} className="text-muted-foreground hover:text-foreground p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Jobs grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPrepare={() => prepareMutation.mutate(job.id)}
                isPreparing={preparingJobId === job.id}
                smartMatch={smartMatchMode ? smartMatches[job.id] : undefined}
              />
            ))}
          </div>
          {!smartMatchMode && data && data.pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>←</Button>
              <span className="text-sm text-muted-foreground">Page {page} / {data.pagination.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>→</Button>
            </div>
          )}
        </>
      )}

      {/* Smart Match loading overlay */}
      {smartMatchMutation.isLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto">
              <Zap className="w-7 h-7 text-violet-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Smart Match en cours</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Claude analyse {data?.jobs.length ?? '…'} offres par rapport à votre profil…
              </p>
            </div>
            <div className="space-y-2 text-left text-sm">
              {[
                'Lecture de votre CV et compétences…',
                'Scoring de chaque offre (0–100)…',
                'Tri par compatibilité décroissante…',
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"
                    style={{ animationDelay: `${i * 250}ms` }}
                  />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Application preparing overlay */}
      {preparingJobId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Claude prépare votre candidature</h3>
              <p className="text-sm text-muted-foreground mt-1">Analyse ATS + lettre personnalisée en cours…</p>
            </div>
            <div className="space-y-2 text-left text-sm">
              {['Analyse de compatibilité avec le poste…', 'Rédaction de la lettre de motivation…'].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preparation result modal */}
      {preparedApp && (
        <PreparationModal
          app={preparedApp}
          onClose={() => setPreparedApp(null)}
          onSubmitted={() => {
            setPreparedApp(null);
            queryClient.invalidateQueries('applications');
            toast({ title: '✅ Candidature enregistrée', description: 'Visible dans votre suivi des candidatures.' });
          }}
        />
      )}

      {/* Bulk apply modal */}
      {showBulkModal && (
        <BulkApplyModal
          jobs={data?.jobs ?? []}
          smartMatches={smartMatches}
          onClose={() => setShowBulkModal(false)}
          onSuccess={({ created }) => {
            setShowBulkModal(false);
            queryClient.invalidateQueries('applications');
            toast({
              title: `✅ ${created} candidature${created > 1 ? 's' : ''} préparée${created > 1 ? 's' : ''}`,
              description: 'Rendez-vous dans "Mes candidatures" pour générer les lettres et envoyer.',
            });
            router.push('/applications');
          }}
        />
      )}
    </div>
  );
}

// ── JobCard ────────────────────────────────────────────────────────────────────

function JobCard({
  job, onPrepare, isPreparing, smartMatch,
}: {
  job: Job;
  onPrepare: () => void;
  isPreparing: boolean;
  smartMatch?: JobMatch;
}) {
  const matchPct = job.matchScore ? Math.round(job.matchScore * 100) : null;

  // In smart match mode, show AI score badge (violet) instead of heuristic badge
  const aiBadge = smartMatch
    ? {
        score: smartMatch.score,
        color:
          smartMatch.score >= 70
            ? 'bg-violet-500/10 text-violet-600'
            : smartMatch.score >= 40
            ? 'bg-amber-500/10 text-amber-600'
            : 'bg-muted text-muted-foreground',
      }
    : null;

  return (
    <div
      className={`rounded-xl border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors ${
        smartMatch && smartMatch.score >= 70
          ? 'border-violet-300 dark:border-violet-700'
          : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold line-clamp-2">{job.title}</p>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{job.company}</span>
          </div>
        </div>

        {/* Score badge — AI score takes priority in smart match mode */}
        {aiBadge ? (
          <div className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${aiBadge.color}`}>
            <Zap className="w-2.5 h-2.5" />
            {aiBadge.score}%
          </div>
        ) : matchPct !== null ? (
          <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${matchPct >= 70 ? 'bg-emerald-500/10 text-emerald-600' : matchPct >= 40 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
            {matchPct}%
          </div>
        ) : null}
      </div>

      {/* AI match reason — shown only in smart match mode */}
      {smartMatch && (
        <p className="text-xs italic text-violet-600 dark:text-violet-400 leading-relaxed">
          {smartMatch.reason}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
        {job.isRemote && <span className="flex items-center gap-1 text-emerald-600"><Wifi className="w-3 h-3" />Remote</span>}
        {job.salaryMin && <span>{job.salaryMin.toLocaleString('fr-CH')}–{job.salaryMax?.toLocaleString('fr-CH') ?? '?'} {job.currency}</span>}
      </div>

      {!smartMatch && job.aiSummary && (
        <p className="text-xs text-muted-foreground line-clamp-2">{job.aiSummary}</p>
      )}

      <div className="flex flex-wrap gap-1">
        {job.skills.slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[job.source]}`}>
          {SOURCE_LABELS[job.source]}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" asChild>
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs bg-primary text-primary-foreground"
            onClick={onPrepare}
            disabled={isPreparing}
          >
            <Sparkles className="w-3 h-3" /> Préparer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── BulkApplyModal ─────────────────────────────────────────────────────────────

function BulkApplyModal({
  jobs, smartMatches, onClose, onSuccess,
}: {
  jobs: Job[];
  smartMatches: Record<string, JobMatch>;
  onClose: () => void;
  onSuccess: (result: { created: number; skipped: number }) => void;
}) {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState(70);

  const eligible = jobs
    .filter((j) => (smartMatches[j.id]?.score ?? 0) >= threshold)
    .sort((a, b) => (smartMatches[b.id]?.score ?? 0) - (smartMatches[a.id]?.score ?? 0));

  const bulkMutation = useMutation(
    () => {
      const smartMatchData: Record<string, { score: number; reason: string }> = {};
      eligible.forEach((j) => {
        const m = smartMatches[j.id];
        if (m) smartMatchData[j.id] = { score: m.score, reason: m.reason };
      });
      return api
        .post<{ created: number; skipped: number }>('/applications/bulk', {
          jobIds: eligible.map((j) => j.id),
          smartMatchData,
        })
        .then((r) => r.data);
    },
    {
      onSuccess: (data) => onSuccess(data),
      onError: (err: unknown) => {
        toast({
          variant: 'destructive',
          title: 'Erreur lors de la postulation en masse',
          description:
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Une erreur est survenue.',
        });
      },
    },
  );

  const scoreColor = (score: number) =>
    score >= 80
      ? 'bg-violet-500/15 text-violet-700'
      : score >= 60
      ? 'bg-amber-500/10 text-amber-600'
      : 'bg-muted text-muted-foreground';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-600" />
              Postulation en masse
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Préparez plusieurs candidatures d&apos;un coup
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Score minimum de compatibilité</label>
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded-full ${scoreColor(threshold)}`}
              >
                ≥ {threshold}%
              </span>
            </div>
            <input
              type="range" min={50} max={95} step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-600 bg-muted"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50% — large</span>
              <span>70% — recommandé</span>
              <span>95% — strict</span>
            </div>
          </div>

          {/* Eligible jobs count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Offres sélectionnées</span>
            <span className={`font-bold text-lg ${eligible.length > 0 ? 'text-violet-600' : 'text-muted-foreground'}`}>
              {eligible.length}
            </span>
          </div>

          {/* Jobs preview list */}
          {eligible.length > 0 ? (
            <div className="rounded-lg border border-border overflow-hidden max-h-52 overflow-y-auto">
              {eligible.map((job) => {
                const m = smartMatches[job.id];
                return (
                  <div key={job.id} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${scoreColor(m?.score ?? 0)}`}>
                      <Zap className="w-2.5 h-2.5" />
                      {m?.score ?? 0}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
                    </div>
                    {m?.reason && (
                      <p className="text-xs text-muted-foreground italic hidden sm:block max-w-[130px] truncate">{m.reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune offre ne correspond à ce seuil.<br />
                <span className="text-xs">Abaissez le curseur pour élargir la sélection.</span>
              </p>
            </div>
          )}

          {/* Info note */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Les candidatures seront créées sans lettre de motivation.
              Vous pourrez générer chaque lettre depuis <strong>Mes candidatures</strong> avant de postuler.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-5 flex gap-3">
          <Button
            onClick={() => bulkMutation.mutate()}
            disabled={!eligible.length || bulkMutation.isLoading}
            className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Layers className="w-4 h-4" />
            {bulkMutation.isLoading
              ? 'Création en cours…'
              : `Préparer ${eligible.length} candidature${eligible.length !== 1 ? 's' : ''}`}
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── PreparationModal ───────────────────────────────────────────────────────────

function PreparationModal({ app, onClose, onSubmitted }: {
  app: PreparedApplication; onClose: () => void; onSubmitted: () => void;
}) {
  const [letter, setLetter] = useState(app.coverLetter ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ats = app.customAnswers?.ats;

  const saveLetter = async () => {
    setSaving(true);
    try { await api.patch(`/applications/${app.id}/cover-letter`, { coverLetter: letter }); setEditing(false); }
    finally { setSaving(false); }
  };

  const markSubmitted = async () => {
    setSubmitting(true);
    try {
      if (editing && letter !== app.coverLetter) await api.patch(`/applications/${app.id}/cover-letter`, { coverLetter: letter });
      await api.post(`/applications/${app.id}/submit`, {});
      onSubmitted();
    } finally { setSubmitting(false); }
  };

  const sc = ats
    ? ats.score >= 70
      ? { text: 'text-emerald-600', bg: 'bg-emerald-500/10' }
      : ats.score >= 40
      ? { text: 'text-amber-600', bg: 'bg-amber-500/10' }
      : { text: 'text-red-500', bg: 'bg-red-500/10' }
    : { text: 'text-muted-foreground', bg: 'bg-muted' };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg">{app.job.title}</h2>
            <p className="text-muted-foreground text-sm">{app.job.company}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* ATS — 2 cols */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Analyse ATS
            </h3>
            {ats ? (
              <>
                <div className={`rounded-xl ${sc.bg} p-4 text-center`}>
                  <div className={`text-4xl font-black ${sc.text}`}>{ats.score}<span className="text-xl font-semibold">/100</span></div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ats.verdict}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Points forts</p>
                  <ul className="space-y-1.5">{ats.strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{s}</li>)}</ul>
                </div>
                {ats.gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Manquants</p>
                    <ul className="space-y-1.5">{ats.gaps.map((g, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />{g}</li>)}</ul>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Suggestions</p>
                  <ul className="space-y-1.5">{ats.suggestions.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-primary font-bold flex-shrink-0">{i+1}.</span>{s}</li>)}</ul>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-muted p-4 text-xs text-muted-foreground text-center">Analyse non disponible (crédits Anthropic insuffisants)</div>
            )}
          </div>

          {/* Cover letter — 3 cols */}
          <div className="md:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Lettre de motivation</h3>
              <button onClick={() => setEditing(!editing)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Pencil className="w-3 h-3" />{editing ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  rows={13}
                  className="w-full text-xs leading-relaxed rounded-lg border border-border bg-background p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" variant="outline" onClick={saveLetter} disabled={saving} className="w-full text-xs h-7">
                  {saving ? 'Enregistrement…' : '✓ Enregistrer'}
                </Button>
              </div>
            ) : letter ? (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">{letter}</div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-xs text-muted-foreground italic text-center">
                Lettre non générée — crédits Anthropic insuffisants.<br />
                <button onClick={() => setEditing(true)} className="text-primary underline mt-1">Écrire manuellement</button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-5 flex flex-col sm:flex-row gap-3">
          <Button onClick={markSubmitted} disabled={submitting} className="flex-1 gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Enregistrement…' : "✓ J'ai envoyé ma candidature"}
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href={app.job.applyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /> Ouvrir l&apos;annonce</a>
          </Button>
          <Button variant="ghost" onClick={onClose} className="sm:w-auto text-muted-foreground text-sm">Plus tard</Button>
        </div>
      </div>
    </div>
  );
}
