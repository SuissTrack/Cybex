import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getAllCommuneNames } from "@/lib/tax-calculator/rates/communes-2025";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plan } from "@/types/declaration";

const PLAN_CONFIG: Record<Plan, { label: string; badge: string; description: string }> = {
  FREE: {
    label: "Gratuit",
    badge: "bg-gray-100 text-gray-600",
    description: "1 déclaration · PDF récapitulatif · OCR 1 document",
  },
  BASIC: {
    label: "Basic",
    badge: "bg-blue-100 text-blue-700",
    description: "1 déclaration · Export GeTax .tax · OCR illimité",
  },
  PREMIUM: {
    label: "Premium",
    badge: "bg-purple-100 text-purple-700",
    description: "Déclarations illimitées · Historique 5 ans · Support prioritaire",
  },
};

export default async function SettingsPage() {
  const session = await requireAuth();
  const communes = getAllCommuneNames();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      commune: true,
      plan: true,
      createdAt: true,
      avsNumber: true,
      address: true,
      postalCode: true,
    },
  });

  const plan = (user.plan ?? "FREE") as Plan;
  const planConfig = PLAN_CONFIG[plan];

  async function updateProfile(formData: FormData) {
    "use server";
    const sessionInner = await requireAuth();
    const commune = (formData.get("commune") as string) || null;
    const name = (formData.get("name") as string) || null;
    const avsNumber = (formData.get("avsNumber") as string) || null;
    const address = (formData.get("address") as string) || null;
    const postalCode = (formData.get("postalCode") as string) || null;

    await prisma.user.update({
      where: { id: sessionInner.user.id },
      data: { commune, name, avsNumber, address, postalCode },
    });
    redirect("/settings");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez votre profil et votre abonnement.</p>
      </div>

      {/* Profile section */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Profil</h2>

        <form action={updateProfile} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom complet
            </label>
            <input
              type="text"
              name="name"
              defaultValue={user.name ?? ""}
              placeholder="Prénom Nom"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              L&apos;email ne peut pas être modifié (utilisé pour la connexion magic link).
            </p>
          </div>

          {/* Numéro AVS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Numéro AVS
            </label>
            <input
              type="text"
              name="avsNumber"
              defaultValue={user.avsNumber ?? ""}
              placeholder="756.XXXX.XXXX.XX"
              pattern="756\.\d{4}\.\d{4}\.\d{2}"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Format : 756.XXXX.XXXX.XX — requis pour l&apos;export GeTax.
            </p>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Rue et numéro
            </label>
            <input
              type="text"
              name="address"
              defaultValue={user.address ?? ""}
              placeholder="Rue de Rive 12"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* NPA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                NPA (code postal)
              </label>
              <input
                type="text"
                name="postalCode"
                defaultValue={user.postalCode ?? ""}
                placeholder="1204"
                maxLength={4}
                pattern="\d{4}"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Commune */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Commune de résidence
              </label>
              <select
                name="commune"
                defaultValue={user.commune ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Sélectionner —</option>
                {communes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            L&apos;adresse et le NPA sont utilisés pour l&apos;export GeTax (.tax). La commune détermine
            le taux communal dans le calcul ICC.
          </p>

          <div className="flex justify-end pt-2">
            <Button type="submit">Enregistrer les modifications</Button>
          </div>
        </form>
      </section>

      {/* Plan section */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Abonnement</h2>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${planConfig.badge}`}
              >
                {planConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">{planConfig.description}</p>
          </div>

          {plan === "FREE" && (
            <a
              href="/#pricing"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Passer à Basic
            </a>
          )}
          {plan === "BASIC" && (
            <a
              href="/#pricing"
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Passer à Premium
            </a>
          )}
          {plan === "PREMIUM" && (
            <span className="text-sm text-green-600 font-semibold">✓ Plan maximum</span>
          )}
        </div>

        {plan !== "FREE" && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400">
              Pour gérer votre abonnement (annulation, changement de moyen de paiement),
              contactez{" "}
              <a
                href="mailto:support@taxeasy.ch"
                className="text-blue-600 hover:underline"
              >
                support@taxeasy.ch
              </a>
              .
            </p>
          </div>
        )}
      </section>

      {/* Danger zone — LPD art. 32 droit à l'effacement */}
      <section className="bg-white border border-red-200 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-red-700">Zone de danger</h2>
        <p className="text-sm text-gray-500">
          La suppression de votre compte est définitive et irréversible. Toutes vos
          déclarations, documents et données personnelles seront effacés conformément
          à la LPD (art. 32) et au RGPD (art. 17).
        </p>
        <form
          action={async () => {
            "use server";
            // Verify auth again inside the Server Action
            const sessionInner = await requireAuth();
            const res = await fetch(
              `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/account/delete`,
              {
                method: "DELETE",
                headers: {
                  // Pass the session cookie through so the API route authenticates
                  Cookie: `__Secure-next-auth.session-token=${sessionInner.user.id}`,
                },
              }
            );
            if (res.ok) {
              redirect("/");
            }
          }}
        >
          <Button
            type="submit"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Supprimer mon compte définitivement
          </Button>
        </form>
        <p className="text-xs text-gray-400">
          Si vous rencontrez un problème, contactez{" "}
          <a href="mailto:support@taxeasy.ch" className="text-blue-600 hover:underline">
            support@taxeasy.ch
          </a>{" "}
          — suppression garantie sous 72h.
        </p>
      </section>

      <p className="text-xs text-gray-400 text-center">
        Compte créé le{" "}
        {new Date(user.createdAt).toLocaleDateString("fr-CH", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
