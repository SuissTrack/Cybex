'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/hooks/useToast';
import { Upload, CheckCircle, ArrowRight } from 'lucide-react';

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: basic info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');

  // Step 2: CV
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 3: preferences
  const [titles, setTitles] = useState('');
  const [locations, setLocations] = useState('');
  const [remote, setRemote] = useState('ANY');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('CHF');

  const goNext = async () => {
    setIsLoading(true);
    try {
      if (step === 1) {
        await api.put('/profile', { firstName, lastName, location });
        setStep(2);
      } else if (step === 2) {
        if (cvFile) {
          const form = new FormData();
          form.append('cv', cvFile);
          await api.post('/profile/cv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        setStep(3);
      } else if (step === 3) {
        await api.put('/profile/preferences', {
          desiredTitles: titles.split(',').map((s) => s.trim()).filter(Boolean),
          desiredLocations: locations.split(',').map((s) => s.trim()).filter(Boolean),
          remotePreference: remote,
          contractTypes: ['CDI'],
          minSalary: salary ? Number(salary) : undefined,
          currency,
          targetCountries: ['CH', 'FR'],
        });
        router.replace('/dashboard');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez réessayer.' });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = ['Profil', 'CV', 'Préférences'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Progress */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl mb-6">K</div>
          <div className="flex items-center gap-2 justify-center mb-2">
            {steps.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 < step ? 'bg-emerald-500 text-white' : i + 1 === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${i + 1 === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
                {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">Bienvenue sur Kairos 👋</h2>
              <p className="text-muted-foreground text-sm">Quelques informations pour personnaliser votre expérience</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sophie" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Martin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Genève, Suisse" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-bold">Uploadez votre CV</h2>
              <p className="text-muted-foreground text-sm">L'IA l'utilisera pour générer vos lettres de motivation et remplir les formulaires</p>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${cvFile ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border hover:border-primary/50'}`}
                onClick={() => fileRef.current?.click()}
              >
                {cvFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                    <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">{cvFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(cvFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">Cliquez pour sélectionner votre CV</p>
                    <p className="text-sm text-muted-foreground">PDF, DOC, DOCX — max 10 Mo</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
              </div>
              <p className="text-xs text-muted-foreground text-center">Vous pourrez le modifier plus tard dans votre profil</p>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-bold">Vos préférences d'emploi</h2>
              <p className="text-muted-foreground text-sm">Kairos cherchera et postulera uniquement aux offres qui vous correspondent</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Titres recherchés (séparés par des virgules)</Label>
                  <Input value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="Software Engineer, Fullstack Developer" />
                </div>
                <div className="space-y-2">
                  <Label>Localisations</Label>
                  <Input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Genève, Lausanne, Remote" />
                </div>
                <div className="space-y-2">
                  <Label>Télétravail</Label>
                  <div className="flex gap-2">
                    {[['ANY', 'Tous'], ['REMOTE', 'Remote'], ['HYBRID', 'Hybride'], ['ONSITE', 'Présentiel']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setRemote(v)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${remote === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Salaire minimum</Label>
                    <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="80000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="CHF">CHF</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <Button onClick={goNext} disabled={isLoading} className="w-full gap-2">
            {isLoading ? 'Chargement…' : step === 3 ? 'Commencer !' : 'Continuer'}
            {!isLoading && step < 3 && <ArrowRight className="w-4 h-4" />}
          </Button>

          {step > 1 && (
            <button onClick={() => setStep((s) => (s - 1) as Step)} className="w-full text-sm text-muted-foreground hover:text-foreground">
              ← Retour
            </button>
          )}
          {step === 2 && !cvFile && (
            <button onClick={goNext} className="w-full text-sm text-muted-foreground hover:text-foreground">
              Ignorer pour l'instant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
