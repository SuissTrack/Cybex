'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { Upload, User, Target, CheckCircle } from 'lucide-react';

interface Profile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  skills: string[];
  cvOriginalName?: string;
  cvParsedAt?: string;
  preferences?: {
    desiredTitles: string[];
    desiredLocations: string[];
    remotePreference: string;
    contractTypes: string[];
    minSalary?: number;
    currency: string;
  };
}

export default function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'cv' | 'preferences'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery<Profile>('profile', () =>
    api.get<Profile>('/profile').then((r) => r.data),
  );

  const tabs = [
    { id: 'info', label: 'Informations', icon: User },
    { id: 'cv', label: 'CV', icon: Upload },
    { id: 'preferences', label: 'Préférences', icon: Target },
  ] as const;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">Informations utilisées par l'IA pour vos candidatures</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && <ProfileInfoTab profile={profile} onSuccess={() => queryClient.invalidateQueries('profile')} />}
      {activeTab === 'cv' && <CvTab profile={profile} onSuccess={() => queryClient.invalidateQueries('profile')} />}
      {activeTab === 'preferences' && <PreferencesTab profile={profile} onSuccess={() => queryClient.invalidateQueries('profile')} />}
    </div>
  );
}

function ProfileInfoTab({ profile, onSuccess }: { profile?: Profile; onSuccess: () => void }) {
  const { toast } = useToast();
  const { register, handleSubmit } = useForm({ defaultValues: profile ?? {} });

  const mutation = useMutation(
    (data: Record<string, unknown>) => api.put('/profile', data),
    { onSuccess: () => { toast({ title: 'Profil mis à jour' }); onSuccess(); } },
  );

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as Record<string, unknown>))} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom</Label>
          <Input {...register('firstName')} placeholder="Sophie" />
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input {...register('lastName')} placeholder="Martin" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Téléphone</Label>
        <Input {...register('phone')} placeholder="+41 79 123 45 67" />
      </div>
      <div className="space-y-2">
        <Label>Localisation</Label>
        <Input {...register('location')} placeholder="Genève, Suisse" />
      </div>
      <div className="space-y-2">
        <Label>URL LinkedIn</Label>
        <Input {...register('linkedinUrl')} placeholder="https://linkedin.com/in/…" />
      </div>
      <div className="space-y-2">
        <Label>Portfolio / Site web</Label>
        <Input {...register('portfolioUrl')} placeholder="https://…" />
      </div>
      <div className="space-y-2">
        <Label>Résumé professionnel</Label>
        <textarea
          {...register('summary')}
          rows={4}
          placeholder="Décrivez votre profil en quelques phrases…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}

function CvTab({ profile, onSuccess }: { profile?: Profile; onSuccess: () => void }) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation(
    (file: File) => {
      const form = new FormData();
      form.append('cv', file);
      return api.post('/profile/cv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    {
      onSuccess: () => { toast({ title: 'CV uploadé avec succès' }); onSuccess(); },
      onError: () => toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'uploader le CV' }),
    },
  );

  const handleFile = (file: File) => {
    if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      toast({ variant: 'destructive', title: 'Format invalide', description: 'Seuls les fichiers PDF, DOC et DOCX sont acceptés.' });
      return;
    }
    uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      {profile?.cvOriginalName && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">{profile.cvOriginalName}</p>
            {profile.cvParsedAt && (
              <p className="text-xs text-emerald-600/70">Analysé le {new Date(profile.cvParsedAt).toLocaleDateString('fr-CH')}</p>
            )}
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">{uploadMutation.isLoading ? 'Upload en cours…' : 'Glissez votre CV ici ou cliquez'}</p>
        <p className="text-sm text-muted-foreground mt-1">PDF, DOC, DOCX — max 10 Mo</p>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
      </div>
    </div>
  );
}

function PreferencesTab({ profile, onSuccess }: { profile?: Profile; onSuccess: () => void }) {
  const { toast } = useToast();
  const prefs = profile?.preferences;

  const [titlesInput, setTitlesInput] = useState(prefs?.desiredTitles.join(', ') ?? '');
  const [locationsInput, setLocationsInput] = useState(prefs?.desiredLocations.join(', ') ?? '');
  const [remote, setRemote] = useState(prefs?.remotePreference ?? 'ANY');
  const [contracts, setContracts] = useState<string[]>(prefs?.contractTypes ?? ['CDI']);
  const [minSalary, setMinSalary] = useState(prefs?.minSalary ?? '');
  const [currency, setCurrency] = useState(prefs?.currency ?? 'CHF');

  const mutation = useMutation(
    (data: unknown) => api.put('/profile/preferences', data),
    { onSuccess: () => { toast({ title: 'Préférences enregistrées' }); onSuccess(); } },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      desiredTitles: titlesInput.split(',').map((s) => s.trim()).filter(Boolean),
      desiredLocations: locationsInput.split(',').map((s) => s.trim()).filter(Boolean),
      remotePreference: remote,
      contractTypes: contracts,
      minSalary: minSalary ? Number(minSalary) : undefined,
      currency,
      targetCountries: ['CH', 'FR'],
    });
  };

  const toggleContract = (c: string) =>
    setContracts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Titres recherchés (séparés par des virgules)</Label>
        <Input value={titlesInput} onChange={(e) => setTitlesInput(e.target.value)} placeholder="Software Engineer, Fullstack Developer, Tech Lead" />
      </div>
      <div className="space-y-2">
        <Label>Localisations (séparées par des virgules)</Label>
        <Input value={locationsInput} onChange={(e) => setLocationsInput(e.target.value)} placeholder="Genève, Lausanne, Zurich, Remote" />
      </div>
      <div className="space-y-2">
        <Label>Télétravail</Label>
        <div className="flex gap-2 flex-wrap">
          {[['ANY', 'Tous'], ['REMOTE', 'Full remote'], ['HYBRID', 'Hybride'], ['ONSITE', 'Présentiel']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setRemote(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${remote === val ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Type de contrat</Label>
        <div className="flex gap-2 flex-wrap">
          {[['CDI', 'CDI'], ['CDD', 'CDD'], ['FREELANCE', 'Freelance'], ['INTERNSHIP', 'Stage']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => toggleContract(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${contracts.includes(val) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Salaire minimum</Label>
          <Input type="number" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} placeholder="80000" />
        </div>
        <div className="space-y-2">
          <Label>Devise</Label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="CHF">CHF</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>
      <Button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? 'Enregistrement…' : 'Enregistrer les préférences'}
      </Button>
    </form>
  );
}
