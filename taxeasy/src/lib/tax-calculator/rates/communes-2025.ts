/**
 * Taux communaux ICC 2025 — 45 communes genevoises
 * Source : AFC-GE, barème communal 2025
 * Taux exprimés en décimal (ex: 0.455 = 45.5%)
 */

export interface CommuneRate {
  name: string;
  /** Taux additionnel communal (décimal) */
  rate: number;
}

export const COMMUNES_2025: CommuneRate[] = [
  { name: "Aire-la-Ville", rate: 0.52 },
  { name: "Anières", rate: 0.44 },
  { name: "Avully", rate: 0.55 },
  { name: "Avusy", rate: 0.53 },
  { name: "Bardonnex", rate: 0.49 },
  { name: "Bellevue", rate: 0.43 },
  { name: "Bernex", rate: 0.52 },
  { name: "Carouge", rate: 0.495 },
  { name: "Cartigny", rate: 0.50 },
  { name: "Céligny", rate: 0.38 },
  { name: "Chêne-Bougeries", rate: 0.465 },
  { name: "Chêne-Bourg", rate: 0.50 },
  { name: "Choulex", rate: 0.49 },
  { name: "Collex-Bossy", rate: 0.45 },
  { name: "Collonge-Bellerive", rate: 0.435 },
  { name: "Cologny", rate: 0.34 },
  { name: "Confignon", rate: 0.52 },
  { name: "Corsier", rate: 0.44 },
  { name: "Dardagny", rate: 0.50 },
  { name: "Genève-Ville", rate: 0.455 },
  { name: "Genthod", rate: 0.38 },
  { name: "Grand-Saconnex", rate: 0.45 },
  { name: "Gy", rate: 0.48 },
  { name: "Hermance", rate: 0.435 },
  { name: "Jussy", rate: 0.49 },
  { name: "Laconnex", rate: 0.52 },
  { name: "Lancy", rate: 0.51 },
  { name: "Meinier", rate: 0.47 },
  { name: "Meyrin", rate: 0.495 },
  { name: "Onex", rate: 0.53 },
  { name: "Perly-Certoux", rate: 0.50 },
  { name: "Plan-les-Ouates", rate: 0.40 },
  { name: "Pregny-Chambésy", rate: 0.385 },
  { name: "Presinge", rate: 0.47 },
  { name: "Puplinge", rate: 0.49 },
  { name: "Russin", rate: 0.50 },
  { name: "Satigny", rate: 0.48 },
  { name: "Soral", rate: 0.52 },
  { name: "Thônex", rate: 0.50 },
  { name: "Troinex", rate: 0.445 },
  { name: "Vandœuvres", rate: 0.40 },
  { name: "Vernier", rate: 0.51 },
  { name: "Versoix", rate: 0.465 },
  { name: "Veyrier", rate: 0.475 },
];

/** Lookup map for O(1) access */
const COMMUNES_MAP = new Map<string, number>(
  COMMUNES_2025.map((c) => [c.name.toLowerCase(), c.rate])
);

/**
 * Returns the communal rate for a given commune name (case-insensitive).
 * Falls back to Genève-Ville rate (45.5%) if not found.
 */
export function getCommuneRate(commune: string): number {
  return COMMUNES_MAP.get(commune.toLowerCase()) ?? 0.455;
}

/**
 * Returns a sorted list of all commune names for UI display.
 */
export function getAllCommuneNames(): string[] {
  return Array.from(new Set(COMMUNES_2025.map((c) => c.name))).sort();
}
