"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Composant interne isolé — useSearchParams requiert Suspense en Next.js 14
function LoginForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const isVerify = searchParams.get("verify") === "1";
  const hasError = searchParams.get("error") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("nodemailer", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Une erreur est survenue. Vérifiez votre adresse email.");
      } else {
        setIsSent(true);
      }
    } catch {
      setError("Impossible d'envoyer l'email. Réessayez dans quelques instants.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSent || isVerify) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle>Vérifiez votre email</CardTitle>
            <CardDescription>
              Un lien de connexion vous a été envoyé à <strong>{email}</strong>.
              Cliquez sur le lien pour accéder à votre espace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center">
              Le lien expire dans 24 heures. Si vous ne recevez pas l&apos;email,
              vérifiez vos spams.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <span className="text-3xl font-bold text-blue-600">TaxEasy</span>
            <span className="block text-sm text-gray-500">Déclaration d&apos;impôt simplifiée</span>
          </div>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Entrez votre email — nous vous envoyons un lien de connexion sécurisé.
            Pas de mot de passe à retenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Erreur d&apos;authentification. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.ch"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Envoi en cours…" : "Recevoir le lien de connexion"}
            </Button>
          </form>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-400 mb-2 text-center">Mode développement</p>
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() =>
                  signIn("credentials", { email: "alice@example.com", callbackUrl: "/dashboard" })
                }
              >
                Se connecter en tant qu&apos;alice@example.com
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse text-gray-400">Chargement…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
