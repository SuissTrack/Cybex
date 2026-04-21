"use client";

import { useState } from "react";
import { OcrStatusBadge } from "./OcrStatusBadge";
import { DOC_TYPE_LABELS } from "@/types/document";
import { DocType, OcrStatus } from "@/types/declaration";
import { ExtractedData, SalaryCertificateData, LppAttestationData, Pillar3aData, LamalData, BankStatementData } from "@/types/document";
import { formatCHF } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";

interface DocumentCardProps {
  id: string;
  type: DocType;
  filename: string;
  ocrStatus: OcrStatus;
  confidence: number | null;
  extractedData: ExtractedData | null;
  uploadedAt: Date | string;
  onDelete?: (id: string) => void;
}

/**
 * Carte document avec statut OCR, données extraites en accordéon, et suppression.
 */
export function DocumentCard({
  id,
  type,
  filename,
  ocrStatus,
  confidence,
  extractedData,
  uploadedAt,
  onDelete,
}: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasExtractedData = extractedData && extractedData._type !== "generic";
  const date = new Date(uploadedAt).toLocaleDateString("fr-CH");

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm(`Supprimer le document "${filename}" ?`)) return;
    setDeleting(true);
    onDelete(id);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">{docTypeIcon(type)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{filename}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {DOC_TYPE_LABELS[type]} · Importé le {date}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <OcrStatusBadge status={ocrStatus} confidence={confidence} />
          {hasExtractedData && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {expanded ? "Masquer" : "Voir données"}
            </button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-400 hover:text-red-600 h-7 w-7 p-0"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* OCR fallback notice */}
      {ocrStatus === "MANUAL_REVIEW" && (
        <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          La confiance OCR est insuffisante. Vérifiez les données extraites et
          corrigez si nécessaire.
        </div>
      )}

      {/* Extracted data accordion */}
      {expanded && extractedData && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Données extraites
          </p>
          <ExtractedDataView data={extractedData} />
        </div>
      )}
    </div>
  );
}

/* ─── Extracted data views ───────────────────────────────────────── */

function ExtractedDataView({ data }: { data: ExtractedData }) {
  if (data._type === "salary_cert") return <SalaryCertView data={data} />;
  if (data._type === "lpp") return <LppView data={data} />;
  if (data._type === "pillar3a") return <Pillar3aView data={data} />;
  if (data._type === "lamal") return <LamalView data={data} />;
  if (data._type === "bank_statement") return <BankView data={data} />;
  if (data._type === "generic") {
    return (
      <p className="text-xs text-gray-500">
        Données génériques extraites — saisie manuelle recommandée.
      </p>
    );
  }
  return null;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800 tabular-nums">{value}</span>
    </div>
  );
}

function SalaryCertView({ data }: { data: SalaryCertificateData }) {
  return (
    <div className="space-y-0.5">
      {data.employer && <DataRow label="Employeur" value={data.employer} />}
      <DataRow label="Année" value={String(data.year)} />
      <DataRow label="Salaire brut" value={formatCHF(data.grossSalary)} />
      <DataRow label="Cotisations LPP" value={formatCHF(data.lppContributions)} />
      <DataRow label="Cotisations AVS" value={formatCHF(data.avsContributions)} />
      <DataRow label="Cotisations AC" value={formatCHF(data.acContributions)} />
      {data.familyAllowances > 0 && (
        <DataRow label="Allocations familiales" value={formatCHF(data.familyAllowances)} />
      )}
      {data.sourceWithholding > 0 && (
        <DataRow label="Impôt à la source" value={formatCHF(data.sourceWithholding)} />
      )}
    </div>
  );
}

function LppView({ data }: { data: LppAttestationData }) {
  return (
    <div className="space-y-0.5">
      <DataRow label="Caisse de pension" value={data.pensionFund} />
      <DataRow label="Année" value={String(data.year)} />
      <DataRow label="Cotisations obligatoires" value={formatCHF(data.mandatoryContributions)} />
      {data.voluntaryPurchase > 0 && (
        <DataRow label="Rachat volontaire" value={formatCHF(data.voluntaryPurchase)} />
      )}
    </div>
  );
}

function Pillar3aView({ data }: { data: Pillar3aData }) {
  return (
    <div className="space-y-0.5">
      <DataRow label="Prestataire" value={data.provider} />
      <DataRow label="Année" value={String(data.year)} />
      <DataRow label="Versements" value={formatCHF(data.contributions)} />
      {data.isRetroactive && (
        <DataRow
          label="Rachat rétroactif"
          value={data.retroactiveYears?.join(", ") ?? "oui"}
        />
      )}
    </div>
  );
}

function LamalView({ data }: { data: LamalData }) {
  return (
    <div className="space-y-0.5">
      <DataRow label="Assureur" value={data.insurer} />
      <DataRow label="Année" value={String(data.year)} />
      <DataRow label="Prime annuelle" value={formatCHF(data.annualPremium)} />
      {data.subsidy > 0 && (
        <DataRow label="Subside LAMal" value={formatCHF(data.subsidy)} />
      )}
    </div>
  );
}

function BankView({ data }: { data: BankStatementData }) {
  return (
    <div className="space-y-0.5">
      <DataRow label="Établissement" value={data.institution} />
      <DataRow label="Année" value={String(data.year)} />
      <DataRow label="Solde au 31.12" value={formatCHF(data.balance)} />
      {data.grossInterest > 0 && (
        <DataRow label="Intérêts bruts" value={formatCHF(data.grossInterest)} />
      )}
      {data.anticipatoryTax > 0 && (
        <DataRow label="Impôt anticipé (35 %)" value={formatCHF(data.anticipatoryTax)} />
      )}
    </div>
  );
}

/* ─── utils ──────────────────────────────────────────────────────── */

function docTypeIcon(type: DocType): string {
  const icons: Record<DocType, string> = {
    SALARY_CERT: "💼",
    LPP: "🏦",
    PILLAR3A: "💰",
    PILLAR3B: "🛡️",
    BANK_STATEMENT: "🏛️",
    LAMAL: "🏥",
    MEDICAL: "🩺",
    DONATION: "❤️",
    REAL_ESTATE: "🏠",
    OTHER: "📎",
  };
  return icons[type] ?? "📄";
}
