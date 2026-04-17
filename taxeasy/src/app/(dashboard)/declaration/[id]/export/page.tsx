import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { getDeclarationById } from "@/lib/db/queries/declarations";
import { prisma } from "@/lib/db/client";
import { ExportButtons } from "@/components/declaration/ExportButtons";
import { TaxSummary } from "@/components/declaration/TaxSummary";
import { ComputedTax, Plan } from "@/types/declaration";

export default async function ExportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth();
  const declaration = await getDeclarationById(params.id, session.user.id);

  if (!declaration) notFound();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { plan: true },
  });

  const computedTax = declaration.computedTax as ComputedTax | null;
  const isCompleted =
    declaration.status === "COMPLETED" || declaration.status === "SUBMITTED";
  const userPlan = (user.plan ?? "FREE") as Plan;

  // Past exports
  const exports = await prisma.export.findMany({
    where: { declarationId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/declaration/${params.id}/review`}
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Retour à la révision
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Export — Déclaration {declaration.taxYear}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Téléchargez votre dossier fiscal au format PDF ou GeTax .tax.
        </p>
      </div>

      {/* Tax summary compact */}
      {computedTax && <TaxSummary computedTax={computedTax} />}

      {/* Export buttons */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Exporter</h2>
        <ExportButtons
          declarationId={params.id}
          userPlan={userPlan}
          isCompleted={isCompleted}
        />
      </div>

      {/* Instructions GeTax */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-blue-900">
          📋 Comment importer dans GeTax
        </h2>
        <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
          <li>
            Téléchargez le fichier <strong>.tax</strong> ci-dessus.
          </li>
          <li>
            Ouvrez GeTax sur{" "}
            <a
              href="https://www.ge.ch/taxes/getax"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              ge.ch/taxes/getax
            </a>{" "}
            ou l&apos;application desktop.
          </li>
          <li>
            Choisissez <strong>Fichier → Ouvrir</strong> et sélectionnez le
            fichier .tax téléchargé.
          </li>
          <li>
            Vérifiez les données pré-remplies, complétez les champs manquants
            si nécessaire.
          </li>
          <li>
            Soumettez votre déclaration en ligne via GeTax avant le{" "}
            <strong>31 mars 2026</strong>.
          </li>
        </ol>
        <p className="text-xs text-blue-700 mt-2">
          Vous pouvez demander une prolongation jusqu&apos;au 30 juin 2026
          via le formulaire de demande sur ge.ch.
        </p>
      </div>

      {/* Past exports */}
      {exports.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Exports précédents
          </h2>
          <div className="space-y-2">
            {exports.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span>{exp.format === "PDF" ? "📄" : "🇨🇭"}</span>
                  <span className="text-gray-700">{exp.format}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {new Date(exp.createdAt).toLocaleDateString("fr-CH", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard" className="flex-1">
          <button className="w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Retour au dashboard
          </button>
        </Link>
        <a
          href="https://www.ge.ch/taxes/getax"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
            Ouvrir GeTax officiel ↗
          </button>
        </a>
      </div>
    </div>
  );
}
