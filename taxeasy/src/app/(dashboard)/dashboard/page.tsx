import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { getDeclarationsByUser } from "@/lib/db/queries/declarations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCHF } from "@/lib/utils/currency";
import { ComputedTax } from "@/types/declaration";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: "En cours", color: "bg-yellow-100 text-yellow-700" },
  REVIEW_PENDING: { label: "À réviser", color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Complète", color: "bg-green-100 text-green-700" },
  SUBMITTED: { label: "Soumise", color: "bg-gray-100 text-gray-700" },
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const declarations = await getDeclarationsByUser(session.user.id);

  const FISCAL_DEADLINE = "31 mars 2026";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes déclarations</h1>
          <p className="text-gray-500 text-sm mt-1">
            Deadline fiscale genevoise : <strong>{FISCAL_DEADLINE}</strong>
          </p>
        </div>
        <Link href="/declaration/new">
          <Button>+ Nouvelle déclaration</Button>
        </Link>
      </div>

      {/* Declarations list */}
      {declarations.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="text-5xl mb-4">🧾</div>
            <CardTitle className="mb-2">Aucune déclaration</CardTitle>
            <CardDescription className="mb-6">
              Commencez votre déclaration d&apos;impôt 2025 en quelques minutes.
            </CardDescription>
            <Link href="/declaration/new">
              <Button>Démarrer ma déclaration</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {declarations.map((decl) => {
            const tax = decl.computedTax as ComputedTax | null;
            const status = STATUS_LABELS[decl.status] ?? STATUS_LABELS.IN_PROGRESS;
            const docCount = decl.documents.length;

            return (
              <Card key={decl.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">
                      Déclaration {decl.taxYear}
                    </CardTitle>
                    <CardDescription>
                      Mise à jour le{" "}
                      {new Date(decl.updatedAt).toLocaleDateString("fr-CH")}
                      {decl.isTOU && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          TOU
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>{docCount} document{docCount !== 1 ? "s" : ""}</span>
                      {tax?.total != null && (
                        <span className="font-semibold text-gray-900">
                          Estimation : {formatCHF(tax.total)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {decl.exports.length > 0 && (
                        <Link href={`/declaration/${decl.id}/export`}>
                          <Button variant="outline" size="sm">Exporter</Button>
                        </Link>
                      )}
                      <Link href={`/declaration/${decl.id}`}>
                        <Button size="sm">
                          {decl.status === "IN_PROGRESS" ? "Continuer" : "Voir"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reminder card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-orange-800">
                Délai de dépôt : {FISCAL_DEADLINE}
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Vous pouvez demander une prolongation jusqu&apos;au 30 juin 2026
                via le formulaire en ligne sur ge.ch.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
