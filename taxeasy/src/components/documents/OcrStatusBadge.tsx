import { OcrStatus } from "@/types/declaration";

interface OcrStatusBadgeProps {
  status: OcrStatus;
  confidence?: number | null;
}

const STATUS_CONFIG: Record<
  OcrStatus,
  { label: string; className: string; icon: string }
> = {
  PENDING: {
    label: "En attente",
    className: "bg-gray-100 text-gray-600",
    icon: "⏳",
  },
  PROCESSING: {
    label: "Analyse en cours…",
    className: "bg-blue-100 text-blue-700 animate-pulse",
    icon: "🔍",
  },
  DONE: {
    label: "Extrait",
    className: "bg-green-100 text-green-700",
    icon: "✓",
  },
  FAILED: {
    label: "Échec OCR",
    className: "bg-red-100 text-red-700",
    icon: "✕",
  },
  MANUAL_REVIEW: {
    label: "Vérification manuelle",
    className: "bg-amber-100 text-amber-700",
    icon: "⚠️",
  },
};

/**
 * Badge affichant le statut OCR d'un document avec score de confiance.
 */
export function OcrStatusBadge({ status, confidence }: OcrStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {status === "DONE" && confidence != null && (
        <span className="opacity-70">· {Math.round(confidence * 100)} %</span>
      )}
    </span>
  );
}
