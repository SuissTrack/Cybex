'use client';

import { useQuery } from 'react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import { Briefcase, CheckCircle, Clock, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: '#6366f1',
  APPLYING: '#8b5cf6',
  APPLIED: '#06b6d4',
  FAILED: '#ef4444',
  INTERVIEW_SCHEDULED: '#f59e0b',
  OFFER_RECEIVED: '#10b981',
  REJECTED: '#6b7280',
  WITHDRAWN: '#9ca3af',
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'En attente',
  APPLYING: 'En cours',
  APPLIED: 'Envoyée',
  FAILED: 'Échec',
  INTERVIEW_SCHEDULED: 'Entretien',
  OFFER_RECEIVED: 'Offre reçue',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Retirée',
};

export default function DashboardPage() {
  const { data } = useQuery('applications-stats', () =>
    api.get<{ applications: unknown[]; stats: Record<string, number> }>('/applications?limit=5').then((r) => r.data),
  );

  const stats = data?.stats ?? {};
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const applied = stats.APPLIED ?? 0;
  const interviews = stats.INTERVIEW_SCHEDULED ?? 0;
  const offers = stats.OFFER_RECEIVED ?? 0;
  const responseRate = total > 0 ? Math.round(((interviews + offers) / total) * 100) : 0;

  const pieData = Object.entries(stats).map(([status, count]) => ({
    name: STATUS_LABELS[status] ?? status,
    value: count,
    color: STATUS_COLORS[status] ?? '#6b7280',
  }));

  const barData = [
    { name: 'Envoyées', value: applied },
    { name: 'Entretiens', value: interviews },
    { name: 'Offres', value: offers },
    { name: 'Refusées', value: stats.REJECTED ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de vos candidatures</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Total candidatures" value={total} color="bg-indigo-500/10 text-indigo-500" />
        <StatCard icon={CheckCircle} label="Envoyées" value={applied} color="bg-cyan-500/10 text-cyan-500" />
        <StatCard icon={Calendar} label="Entretiens" value={interviews} color="bg-amber-500/10 text-amber-500" />
        <StatCard icon={TrendingUp} label="Taux de réponse" value={`${responseRate}%`} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Statuts des candidatures</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Répartition</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-2 w-8 h-8 opacity-50" />
                Aucune candidature pour l'instant
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent applications */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Dernières candidatures</h2>
          <a href="/applications" className="text-sm text-primary hover:underline">Voir tout</a>
        </div>
        <RecentApplications />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function RecentApplications() {
  const { data, isLoading } = useQuery('recent-applications', () =>
    api.get<{ applications: Array<{ id: string; status: string; job: { title: string; company: string }; createdAt: string }> }>('/applications?limit=5').then((r) => r.data),
  );

  if (isLoading) return <div className="text-muted-foreground text-sm">Chargement…</div>;
  if (!data?.applications.length) return <div className="text-muted-foreground text-sm">Aucune candidature</div>;

  return (
    <div className="divide-y divide-border">
      {data.applications.map((app) => (
        <div key={app.id} className="py-3 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{app.job.title}</p>
            <p className="text-muted-foreground text-xs">{app.job.company}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${STATUS_COLORS[app.status]}20`, color: STATUS_COLORS[app.status] }}
            >
              {STATUS_LABELS[app.status] ?? app.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(app.createdAt).toLocaleDateString('fr-CH')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
