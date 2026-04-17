"use client";

import { useEffect, useState } from "react";
import { TaxSummary } from "@/components/declaration/TaxSummary";
import { ComputedTax } from "@/types/declaration";

interface Props {
  declarationId: string;
}

/**
 * Fetches the computed tax for the current declaration and renders TaxSummary.
 * The tax is computed server-side when the answers API receives currentNodeId="summary".
 */
export function SummaryStep({ declarationId }: Props) {
  const [computedTax, setComputedTax] = useState<ComputedTax | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTax() {
      try {
        const res = await fetch(`/api/declarations/${declarationId}`);
        if (!res.ok) return;
        const data = await res.json();
        setComputedTax(data.declaration?.computedTax ?? null);
      } finally {
        setLoading(false);
      }
    }
    fetchTax();
  }, [declarationId]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!computedTax) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Le calcul fiscal est en cours de finalisation. Cliquez sur{" "}
        <strong>Terminer</strong> pour accéder au récapitulatif complet.
      </div>
    );
  }

  return <TaxSummary computedTax={computedTax} />;
}
