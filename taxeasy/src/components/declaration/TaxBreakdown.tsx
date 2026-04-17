"use client";

import type { ComputedTax } from "@/types/declaration";
import { formatCHF } from "@/lib/utils/currency";
import { useState } from "react";

interface TaxBreakdownProps {
  computedTax: ComputedTax;
}

/**
 * Tableau de décomposition détaillée ICC + IFD + Fortune.
 * Affiche revenus, chaque déduction, et l'impôt calculé.
 */
export function TaxBreakdown({ computedTax }: TaxBreakdownProps) {
  const [activeTab, setActiveTab] = useState<"icc" | "ifd" | "fortune">("icc");
  const { icc, ifd, fortune } = computedTax;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(
          [
            { key: "icc", label: "ICC Cantonal/Communal" },
            { key: "ifd", label: "IFD Fédéral" },
            { key: "fortune", label: "Fortune" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "icc" && (
          <BreakdownSection
            title="Impôt Cantonal et Communal (ICC)"
            rows={[
              { label: "Revenu brut", amount: icc.grossIncome, type: "income" },
              { label: "— AVS / AI / APG / AC", amount: -icc.deductions.avs, type: "deduction" },
              { label: "— LPP obligatoires", amount: -icc.deductions.lpp, type: "deduction" },
              { label: "— Frais professionnels", amount: -icc.deductions.professionalExpenses, type: "deduction" },
              { label: "— Transport", amount: -icc.deductions.transport, type: "deduction" },
              { label: "— Repas", amount: -icc.deductions.meals, type: "deduction" },
              { label: "— Formation continue", amount: -icc.deductions.training, type: "deduction" },
              { label: "— 3ème pilier A", amount: -icc.deductions.pillar3a, type: "deduction" },
              { label: "— 3ème pilier B (ICC)", amount: -icc.deductions.pillar3b, type: "deduction" },
              { label: "— Primes LAMal", amount: -icc.deductions.lamal, type: "deduction" },
              { label: "— Enfants à charge", amount: -icc.deductions.children, type: "deduction" },
              { label: "— Frais de garde", amount: -icc.deductions.childcare, type: "deduction" },
              { label: "— Frais médicaux", amount: -icc.deductions.medical, type: "deduction" },
              { label: "— Dons", amount: -icc.deductions.donations, type: "deduction" },
              { label: "— Pensions alimentaires", amount: -icc.deductions.alimony, type: "deduction" },
              { label: "Revenu net imposable ICC", amount: icc.netIncome, type: "subtotal" },
              { label: `Base de calcul (splitting ${splitLabel(icc.splitting)})`, amount: icc.taxBase, type: "subtotal" },
              { label: "ICC cantonal", amount: icc.cantonalTax, type: "tax" },
              { label: `ICC communal (${(icc.communalRate * 100).toFixed(1)} %)`, amount: icc.communalTax, type: "tax" },
              { label: "Total ICC", amount: icc.total, type: "total" },
            ]}
          />
        )}

        {activeTab === "ifd" && (
          <BreakdownSection
            title="Impôt Fédéral Direct (IFD)"
            rows={[
              { label: "Revenu brut", amount: ifd.grossIncome, type: "income" },
              { label: "— AVS / AI / APG / AC", amount: -ifd.deductions.avs, type: "deduction" },
              { label: "— LPP obligatoires", amount: -ifd.deductions.lpp, type: "deduction" },
              { label: "— Frais professionnels", amount: -ifd.deductions.professionalExpenses, type: "deduction" },
              { label: "— Transport", amount: -ifd.deductions.transport, type: "deduction" },
              { label: "— Repas", amount: -ifd.deductions.meals, type: "deduction" },
              { label: "— Formation continue", amount: -ifd.deductions.training, type: "deduction" },
              { label: "— 3ème pilier A", amount: -ifd.deductions.pillar3a, type: "deduction" },
              { label: "— LAMal + 3B (combiné IFD)", amount: -ifd.deductions.lamalAnd3b, type: "deduction" },
              { label: "— Enfants à charge", amount: -ifd.deductions.children, type: "deduction" },
              { label: "— Frais de garde", amount: -ifd.deductions.childcare, type: "deduction" },
              { label: "— Déduction conjoint", amount: -ifd.deductions.spouseDeduction, type: "deduction" },
              { label: "— Frais médicaux", amount: -ifd.deductions.medical, type: "deduction" },
              { label: "— Dons", amount: -ifd.deductions.donations, type: "deduction" },
              { label: "— Pensions alimentaires", amount: -ifd.deductions.alimony, type: "deduction" },
              { label: "Revenu net imposable IFD", amount: ifd.netIncome, type: "subtotal" },
              { label: `Base de calcul (splitting ${splitLabel(ifd.splitting)})`, amount: ifd.taxBase, type: "subtotal" },
              { label: "Total IFD", amount: ifd.tax, type: "total" },
            ]}
          />
        )}

        {activeTab === "fortune" && (
          <BreakdownSection
            title="Impôt sur la fortune (ICC uniquement)"
            rows={[
              { label: "Fortune brute déclarée", amount: fortune.grossFortune, type: "income" },
              { label: "— Franchise fortune 2025", amount: -fortune.franchise, type: "deduction" },
              { label: "Fortune nette imposable", amount: fortune.netFortune, type: "subtotal" },
              { label: "Impôt de base fortune", amount: fortune.baseTax, type: "tax" },
              { label: "Impôt supplémentaire fortune", amount: fortune.supplementaryTax, type: "tax" },
              {
                label: `Majoration communale (${(fortune.communalRate * 100).toFixed(1)} %)`,
                amount: fortune.total - fortune.baseTax - fortune.supplementaryTax,
                type: "tax",
              },
              { label: "Total impôt fortune", amount: fortune.total, type: "total" },
            ]}
          />
        )}
      </div>
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────── */

function splitLabel(mode: string) {
  if (mode === "full") return "50 %";
  if (mode === "partial") return "55.56 %";
  return "100 %";
}

type RowType = "income" | "deduction" | "subtotal" | "tax" | "total";

interface BreakdownRow {
  label: string;
  amount: number;
  type: RowType;
}

function BreakdownSection({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-1">
        {rows
          .filter((r) => r.amount !== 0)
          .map((row, i) => (
            <BreakdownRowItem key={i} row={row} />
          ))}
      </div>
    </div>
  );
}

function BreakdownRowItem({ row }: { row: BreakdownRow }) {
  const styles: Record<RowType, string> = {
    income: "py-2 text-sm text-gray-700",
    deduction: "py-1.5 text-sm text-gray-500 pl-4",
    subtotal: "py-2.5 text-sm font-semibold text-gray-800 border-t border-gray-200 mt-1",
    tax: "py-2 text-sm text-blue-700",
    total: "py-3 text-base font-bold text-gray-900 border-t-2 border-gray-300 mt-2",
  };

  const amountStyles: Record<RowType, string> = {
    income: "text-gray-700",
    deduction: "text-red-600",
    subtotal: "text-gray-800",
    tax: "text-blue-700",
    total: "text-blue-600",
  };

  return (
    <div className={`flex items-center justify-between ${styles[row.type]}`}>
      <span>{row.label}</span>
      <span className={`tabular-nums font-medium ${amountStyles[row.type]}`}>
        {row.amount < 0
          ? `− ${formatCHF(Math.abs(row.amount))}`
          : formatCHF(row.amount)}
      </span>
    </div>
  );
}
