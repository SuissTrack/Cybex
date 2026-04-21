"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plan } from "@/types/declaration";

interface ExportButtonsProps {
  declarationId: string;
  userPlan: Plan;
  isCompleted: boolean;
}

/**
 * Boutons d'export pour PDF récapitulatif et fichier GeTax .tax.
 * Le .tax est réservé aux plans BASIC et PREMIUM.
 */
export function ExportButtons({
  declarationId,
  userPlan,
  isCompleted,
}: ExportButtonsProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingTax, setLoadingTax] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExportTax = userPlan === "BASIC" || userPlan === "PREMIUM";

  async function handleExport(format: "pdf" | "getax") {
    setError(null);
    const setter = format === "pdf" ? setLoadingPdf : setLoadingTax;
    setter(true);

    try {
      const res = await fetch(
        `/api/declarations/${declarationId}/export?format=${format === "pdf" ? "PDF" : "GETAX_XML"}`,
        { method: "POST" }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Erreur HTTP ${res.status}`);
      }

      // Stream download
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "tax";
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = nameMatch?.[1] ?? `taxeasy-declaration-${declarationId}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setter(false);
    }
  }

  if (!isCompleted) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        ⚠️ Complétez toutes les étapes du wizard pour activer les exports.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* PDF export */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <p className="font-medium text-gray-900 text-sm">PDF récapitulatif</p>
            <p className="text-xs text-gray-400">
              Résumé complet avec ICC, IFD, déductions détaillées
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport("pdf")}
          disabled={loadingPdf}
        >
          {loadingPdf ? "Génération…" : "Télécharger"}
        </Button>
      </div>

      {/* GeTax .tax export */}
      <div className={`flex items-center justify-between rounded-xl p-4 border ${
        canExportTax
          ? "bg-white border-gray-200"
          : "bg-gray-50 border-gray-200 opacity-70"
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇨🇭</span>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              GeTax .tax{" "}
              <span className="text-xs text-blue-600 font-normal">(v1.03)</span>
            </p>
            <p className="text-xs text-gray-400">
              Fichier à importer directement dans GeTax sur ge.ch
            </p>
          </div>
        </div>

        {canExportTax ? (
          <Button
            size="sm"
            onClick={() => handleExport("getax")}
            disabled={loadingTax}
          >
            {loadingTax ? "Génération…" : "Télécharger"}
          </Button>
        ) : (
          <div className="text-right">
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-1 rounded-full">
              BASIC / PREMIUM
            </span>
          </div>
        )}
      </div>

      {!canExportTax && (
        <p className="text-xs text-gray-400 text-center">
          L&apos;export GeTax .tax est inclus à partir du plan{" "}
          <a href="#pricing" className="text-blue-600 hover:underline">
            Basic (CHF 19/an)
          </a>
        </p>
      )}
    </div>
  );
}
