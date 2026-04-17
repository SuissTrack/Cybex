import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { ExtractedData } from "@/types/document";
import { DocType, OcrStatus } from "@/types/declaration";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DocumentsPage() {
  const session = await requireAuth();

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    include: {
      declaration: { select: { id: true, taxYear: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const grouped = documents.reduce(
    (acc, doc) => {
      const key = doc.declarationId ?? "__orphan__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, typeof documents>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes documents</h1>
          <p className="text-gray-500 text-sm mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} importé
            {documents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-5xl mb-4">📁</div>
          <h2 className="font-semibold text-gray-800 mb-2">Aucun document</h2>
          <p className="text-gray-500 text-sm mb-6">
            Vos certificats de salaire, attestations LPP et autres documents
            apparaîtront ici une fois importés via le wizard.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Aller à mes déclarations</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([declId, docs]) => {
            const sampleDoc = docs[0];
            const declaration = sampleDoc?.declaration;
            const title =
              declaration
                ? `Déclaration ${declaration.taxYear}`
                : "Documents sans déclaration";

            return (
              <section key={declId}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-800">{title}</h2>
                  {declaration && (
                    <Link
                      href={`/declaration/${declaration.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Voir la déclaration →
                    </Link>
                  )}
                </div>

                <div className="space-y-3">
                  {docs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      id={doc.id}
                      type={doc.type as DocType}
                      filename={doc.filename}
                      ocrStatus={doc.ocrStatus as OcrStatus}
                      confidence={doc.confidence}
                      extractedData={doc.extractedData as ExtractedData | null}
                      uploadedAt={doc.uploadedAt}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* OCR info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">🔍 À propos de l&apos;OCR</p>
        <p>
          Les documents sont analysés automatiquement à l&apos;import. Si la
          confiance est insuffisante (&lt; 50 %), vous êtes invité(e) à vérifier
          les données manuellement. Vos documents ne sont jamais partagés ni
          accessibles publiquement.
        </p>
      </div>
    </div>
  );
}
