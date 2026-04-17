"use client";

import { ComputedTax } from "@/types/declaration";
import { formatCHF } from "@/lib/utils/currency";

interface TaxSummaryProps {
  computedTax: ComputedTax;
  className?: string;
}

const SPLITTING_LABELS: Record<string, string> = {
  none: "Célibataire / Divorcé(e)",
  full: "Marié(e) — splitting complet",
  partial: "Monoparental(e) — splitting partiel",
};

/**
 * Récapitulatif fiscal compact — total ICC + IFD + fortune.
 * Affiché dans le dashboard et en tête de la page review.
 */
export function TaxSummary({ computedTax, className = "" }: TaxSummaryProps) {
  const { icc, ifd, fortune, total } = computedTax;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
        <p className="text-sm text-blue-200 font-medium uppercase tracking-wide mb-1">
          Estimation totale {computedTax.taxYear}
        </p>
        <p className="text-4xl font-extrabold">{formatCHF(total)}</p>
        <p className="text-sm text-blue-200 mt-1">
          {SPLITTING_LABELS[icc.splitting]} · {computedTax.commune}
        </p>
      </div>

      {/* Breakdown rows */}
      <div className="divide-y divide-gray-100">
        <SummaryRow
          label="ICC cantonal"
          amount={icc.cantonalTax}
          sub={`Barème progressif 2025`}
        />
        <SummaryRow
          label={`ICC communal (${computedTax.commune})`}
          amount={icc.communalTax}
          sub={`Taux communal ${(icc.communalRate * 100).toFixed(1)} %`}
        />
        <SummaryRow
          label="IFD (Impôt Fédéral Direct)"
          amount={ifd.tax}
          sub="Barème fédéral 2025"
        />
        {fortune.total > 0 && (
          <SummaryRow
            label="Impôt sur la fortune"
            amount={fortune.total}
            sub={`Fortune nette : ${formatCHF(fortune.netFortune)}`}
          />
        )}
        <div className="px-6 py-4 flex items-center justify-between bg-gray-50">
          <span className="font-bold text-gray-900">Total estimé</span>
          <span className="font-extrabold text-blue-600 text-lg">{formatCHF(total)}</span>
        </div>
      </div>

      <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
        Estimation basée sur les barèmes AFC-GE 2025. Le montant final est déterminé
        par l&apos;administration fiscale.
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  amount,
  sub,
}: {
  label: string;
  amount: number;
  sub?: string;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {formatCHF(amount)}
      </span>
    </div>
  );
}
