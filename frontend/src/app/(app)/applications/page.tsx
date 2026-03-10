'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircle, Clock, XCircle, Calendar, Gift, AlertCircle,
  ChevronDown, CheckCircle2, Send, ExternalLink, Sparkles, Pencil, ChevronRight, Zap,
} from 'lucide-react';

interface AtsAnalysis {
  score: number; strengths: string[]; gaps: string[]; suggestions: string[]; verdict: string;
}

interface SmartMatchData {
  score: number; reason: string;
}

interface Application {
  id: string; status: string; matchScore?: number; coverLetter?: string;
  appliedAt?: string; interviewDate?: string; notes?: string; failureReason?: string;
  createdAt: string;
  customAnswers?: { ats?: AtsAnalysis; smartMatch?: SmartMatchData };
  job: { id: string; title: string; company: string; location?: string; source: string; applyUrl: string; };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT:                { label: 'Prête à envoyer', color: 'text-violet-600', bg: 'bg-violet-500/10', icon: Sparkles },
  QUEUED:               { label: 'En attente',      color: 'text-indigo-600', bg: 'bg-indigo-500/10', icon: Clock },
  APPLYING:             { label: 'En cours',         color: 'text-purple-600', bg: 'bg-purple-500/10', icon: Clock },
  APPLIED:              { label: 'Envoyée',           color: 'text-cyan-600',   bg: 'bg-cyan-500/10',   icon: CheckCircle },
  FAILED:               { label: 'Échec',             color: 'text-red-600',    bg: 'bg-red-500/10',    icon: XCircle },
  INTERVIEW_SCHEDULED:  { label: 'Entretien',         color: 'text-amber-600',  bg: 'bg-amber-500/10',  icon: Calendar },
  OFFER_RECEIVED:       { label: 'Offre reçue',       color: 'text-emerald-600',bg: 'bg-emerald-500/10',icon: Gift },
  REJECTED:             { label: 'Refusée',            color: 'text-gray-600',   bg: 'bg-gray-500/10',   icon: XCircle },
  WITHDRAWN:            { label: 'Retirée',            color: 'text-gray-500',   bg: 'bg-gray-500/10',   icon: XCircle },
};

const SOURCE_LABELS: Record<string, string> = {
  LINKEDIN: 'LinkedIn', INDEED: 'Indeed', JOBSCH: 'jobs.ch', JOBUPCH: 'jobup.ch', WELCOME_TO_THE_JUNGLE: 'WTTJ',
};

export default function ApplicationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingLetter, setEditingLetter] = useState<{ id: string; text: string } | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(['applications', statusFilter, page], () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    return api.get<{ applications: Application[]; stats: Record<string, number>; pagination: { total: number; pages: number } }>(`/applications?${params}`).then((r) => r.data);
  });

  const updateMutation = useMutation(
    ({ id, status }: { id: string; status: string }) => api.patch(`/applications/${id}`, { status }),
    { onSuccess: () => { queryClient.invalidateQueries('applications'); toast({ title: 'Statut mis à jour' }); } },
  );

  const submitMutation = useMutation(
    (id: string) => api.post(`/applications/${id}/submit`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
        toast({ title: '✅ Candidature marquée comme envoyée' });
      },
    },
  );

  const saveLetterMutation = useMutation(
    ({ id, coverLetter }: { id: string; coverLetter: string }) =>
      api.patch(`/applications/${id}/cover-letter`, { coverLetter }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
        setEditingLetter(null);
        toast({ title: 'Lettre mise à jour' });
      },
    },
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/applications/${id}`),
    { onSuccess: () => { queryClient.invalidateQueries('applications'); toast({ title: 'Candidature supprimée' }); } },
  );

  const [generatingLetterId, setGeneratingLetterId] = useState<string | null>(null);
  const generateLetterMutation = useMutation(
    (id: string) => api.post(`/applications/${id}/generate-letter`, {}).then((r) => r.data),
    {
      onMutate: (id) => setGeneratingLetterId(id),
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
        setGeneratingLetterId(null);
        toast({ title: '✅ Lettre générée', description: 'Relisez et personnalisez avant d\'envoyer.' });
      },
      onError: () => {
        setGeneratingLetterId(null);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de générer la lettre. Vérifiez vos crédits Anthropic.' });
      },
    },
  );

  const stats = data?.stats ?? {};
  const total = data?.pagination.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes candidatures</h1>
        <p className="text-muted-foreground">{total} candidatures au total</p>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${!statusFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
          Toutes ({total})
        </button>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = stats[status] ?? 0;
          if (count === 0) return null;
          return (
            <button key={status} onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${statusFilter === status ? `${config.bg} ${config.color}` : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement…</div>
        ) : !data?.applications.length ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune candidature{statusFilter ? ' avec ce statut' : ''}</p>
            <p className="text-sm text-muted-foreground mt-1">Parcourez les offres et cliquez &quot;Préparer&quot; pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.applications.map((app) => {
              const config = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.APPLIED;
              const Icon = config.icon;
              const isExp = expanded === app.id;
              const ats = app.customAnswers?.ats;
              const smartMatch = app.customAnswers?.smartMatch;
              const isDraft = app.status === 'DRAFT';
              const hasNoLetter = isDraft && !app.coverLetter;
              const isGenerating = generatingLetterId === app.id;

              return (
                <div key={app.id} className={`p-4 ${isDraft ? 'bg-violet-500/5 border-l-2 border-violet-400' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{app.job.title}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-muted-foreground text-xs">{app.job.company}</span>
                        {app.job.location && <span className="text-muted-foreground text-xs hidden sm:inline">· {app.job.location}</span>}
                        {ats && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ats.score >= 70 ? 'bg-emerald-500/10 text-emerald-600' : ats.score >= 40 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500'}`}>
                            ATS {ats.score}/100
                          </span>
                        )}
                        {!ats && smartMatch && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> {smartMatch.score}%
                          </span>
                        )}
                        {hasNoLetter && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                            Sans lettre
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-muted-foreground">{SOURCE_LABELS[app.job.source]}</span>
                        <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString('fr-CH')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isDraft && (
                        <Button size="sm" className="h-7 text-xs gap-1 hidden sm:flex" onClick={() => submitMutation.mutate(app.id)} disabled={submitMutation.isLoading}>
                          <CheckCircle2 className="w-3 h-3" /> Envoyée
                        </Button>
                      )}
                      {!isDraft && (
                        <select value={app.status} onChange={(e) => updateMutation.mutate({ id: app.id, status: e.target.value })}
                          className="text-xs border border-input bg-background rounded px-2 py-1 hidden sm:block">
                          {Object.entries(STATUS_CONFIG).map(([s, c]) => <option key={s} value={s}>{c.label}</option>)}
                        </select>
                      )}
                      <button onClick={() => setExpanded(isExp ? null : app.id)} className="text-muted-foreground hover:text-foreground p-1">
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExp && (
                    <div className="mt-4 ml-12 space-y-4">

                      {/* Smart Match reason (bulk apply) */}
                      {smartMatch && (
                        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-500/5 px-3 py-2 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                          <p className="text-xs text-violet-700 dark:text-violet-400 italic">{smartMatch.reason}</p>
                        </div>
                      )}

                      {/* Generate letter CTA — for DRAFTs without a cover letter */}
                      {hasNoLetter && (
                        <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-500/5 p-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Lettre de motivation manquante</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Générez une lettre personnalisée par Claude avant de postuler.</p>
                          </div>
                          <Button
                            size="sm"
                            className="flex-shrink-0 gap-1.5 text-xs"
                            onClick={() => generateLetterMutation.mutate(app.id)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Sparkles className="w-3 h-3 animate-pulse" /> Génération…
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" /> Générer avec Claude
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* ATS Panel */}
                      {ats && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className={`text-3xl font-black ${ats.score >= 70 ? 'text-emerald-600' : ats.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                              {ats.score}<span className="text-base font-semibold">/100</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{ats.verdict}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Points forts</p>
                            <ul className="space-y-1">{ats.strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1"><ChevronRight className="w-3 h-3 text-emerald-500 flex-shrink-0" />{s}</li>)}</ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Suggestions</p>
                            <ul className="space-y-1">{ats.suggestions.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1"><span className="text-primary font-bold">{i+1}.</span>{s}</li>)}</ul>
                          </div>
                        </div>
                      )}

                      {/* Cover letter */}
                      {app.coverLetter && (
                        <div className="rounded-lg border border-border bg-muted/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                              <Send className="w-3 h-3" /> Lettre de motivation
                            </p>
                            <button
                              onClick={() => setEditingLetter({ id: app.id, text: app.coverLetter! })}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Modifier
                            </button>
                          </div>
                          {editingLetter?.id === app.id ? (
                            <div className="space-y-2">
                              <textarea value={editingLetter.text} onChange={(e) => setEditingLetter({ id: app.id, text: e.target.value })}
                                rows={10} className="w-full text-xs leading-relaxed rounded border border-border bg-background p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                              <div className="flex gap-2">
                                <Button size="sm" className="text-xs h-7 flex-1"
                                  onClick={() => saveLetterMutation.mutate({ id: app.id, coverLetter: editingLetter.text })}
                                  disabled={saveLetterMutation.isLoading}>
                                  {saveLetterMutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditingLetter(null)}>Annuler</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{app.coverLetter}</p>
                          )}
                        </div>
                      )}

                      {app.failureReason && (
                        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/40 p-3">
                          <p className="text-xs text-red-600"><strong>Raison d&apos;échec:</strong> {app.failureReason}</p>
                        </div>
                      )}

                      {app.appliedAt && <p className="text-xs text-muted-foreground">Envoyée le {new Date(app.appliedAt).toLocaleString('fr-CH')}</p>}

                      <div className="flex flex-wrap gap-2">
                        {isDraft && (
                          <Button size="sm" className="text-xs h-7 gap-1" onClick={() => submitMutation.mutate(app.id)} disabled={submitMutation.isLoading}>
                            <CheckCircle2 className="w-3 h-3" /> Marquer comme envoyée
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" asChild>
                          <a href={app.job.applyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /> Voir l&apos;offre</a>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(app.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>←</Button>
          <span className="text-sm text-muted-foreground">Page {page} / {data.pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>→</Button>
        </div>
      )}
    </div>
  );
}
