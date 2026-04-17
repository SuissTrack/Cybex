/**
 * Parser : Certificat de salaire suisse — Formulaire officiel 11 AFC/ESTV 2025
 *
 * Structure officielle du formulaire (cases) :
 *   A        Total du salaire brut (allocations familiales incluses dès 2025)
 *            dont allocations familiales ← sous-case 2025
 *   10.1     AVS/AI/APG (part employé)
 *   10.2     AC — Assurance chômage (LACI)
 *   10.3     AANP — Accident non professionnel (LAA)
 *   11       LPP / 2ème pilier (cotisations obligatoires)
 *   12       Part patronale assurance-maladie LAMal (rare)
 *   13       Impôt à la source retenu
 *   13.1     Frais de représentation
 *   13.2     Frais de voiture
 *   13.3     Autres frais professionnels
 *   15       Remarques diverses
 *
 * Stratégie d'extraction (par ordre de priorité) :
 *   1. Champs structurés Document AI (key-value pairs)
 *   2. Numéros de case officiels (ex: /\b10\.1\b.*?([\d'.\s]+)/)
 *   3. Libellés texte multilingues (FR/DE)
 *   4. Estimation heuristique (pas utilisée — préférer manual_review)
 */

import { OcrRawResult, ParsedDocument } from "../types";
import { SalaryCertificateData } from "@/types/document";

// ─── Normalisation CHF ────────────────────────────────────────────────────────

/**
 * Convertit toutes les variantes CHF rencontrées sur le vrai formulaire en centimes.
 *
 * Formats supportés :
 *   95'000.00   95 000.00   95000.00   95'000.-   95'000.–
 *   9'120.00    9120.-      9120        9120,00
 */
function chfToCentimes(str: string): number {
  if (!str) return 0;
  // Supprimer séparateurs de milliers (apostrophe, espace insécable, espace)
  let s = str.replace(/['\u00a0\s]/g, "");
  // Normaliser séparateur décimal et tirets (.- ou .–)
  s = s.replace(/[,]/, ".").replace(/[–\-]$/, "");
  // Supprimer tout sauf chiffres et point décimal
  s = s.replace(/[^0-9.]/g, "");
  const val = parseFloat(s);
  return isNaN(val) || val < 0 ? 0 : Math.round(val * 100);
}

// ─── Extraction par numéro de case ────────────────────────────────────────────

/**
 * Cherche le montant associé à un numéro de case officiel.
 * Le formulaire imprime le numéro en début de ligne suivi du libellé et du montant.
 *
 * Ex: "A  Total du salaire brut ............. 95'000.00"
 *     "10.1  AVS/AI/APG ....................... 5'035.00"
 */
function extractByCaseNumber(text: string, caseId: string): number {
  // Échappe le point dans le numéro de case (ex: "10.1" → "10\.1")
  const escaped = caseId.replace(".", "\\.");

  // Pattern principal : numéro de case + contenu de ligne + montant final
  // Le montant est le dernier nombre de la ligne (aligné à droite)
  const patterns = [
    // Case en début de ligne, montant en fin (format tableau)
    new RegExp(
      `^\\s*${escaped}[\\s\\t]+[^\\n]{0,120}?[\\s\\t]+(\\d[\\d'\\s]*(?:[.,]\\d{1,2})?(?:[.\\-–])?)\\s*$`,
      "mi"
    ),
    // Case suivie directement du montant (sans libellé long)
    new RegExp(
      `\\b${escaped}\\b[\\s:]+([\\d'][\\d'\\s]*(?:[.,]\\d{1,2})?(?:[.\\-–])?)`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = chfToCentimes(match[1]);
      if (val > 0) return val;
    }
  }
  return 0;
}

// ─── Extraction par libellé textuel ──────────────────────────────────────────

/**
 * Cherche un montant par libellé texte (fallback si les numéros de case ne matchent pas).
 * Supporte FR et DE — le formulaire officiel est bilingue.
 */
function extractByLabel(text: string, patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = chfToCentimes(match[1]);
      if (val > 0) return val;
    }
  }
  return 0;
}

// ─── Extraction champs Document AI ───────────────────────────────────────────

/**
 * Essaie d'abord les champs structurés retournés par Document AI.
 * Ces champs ont des clés normalisées (snake_case).
 */
function fromField(fields: Record<string, string>, ...keys: string[]): number {
  for (const key of keys) {
    const val = fields[key];
    if (val) {
      const amount = chfToCentimes(val);
      if (amount > 0) return amount;
    }
  }
  return 0;
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseSalaryCertificate(raw: OcrRawResult): ParsedDocument | null {
  const text = raw.fullText;
  const fields = raw.fields;

  // ── Case A : Salaire brut total ─────────────────────────────────────────────
  // 2025 : allocations familiales désormais incluses dans le brut (case A)
  const grossSalary =
    fromField(fields, "gross_salary", "salaire_brut", "bruttolohn", "case_a") ||
    extractByCaseNumber(text, "A") ||
    extractByLabel(text, [
      // FR — libellés officiels du formulaire 11
      /(?:total du )?salaire brut\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /revenu brut\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      // DE — formulaire bilingue
      /(?:total )?bruttolohn\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /brutto(?:lohn|gehalt)\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // Sans salaire brut, le document n'est pas un certificat de salaire
  if (grossSalary === 0) return null;

  // ── Allocations familiales (sous-case de A, 2025) ────────────────────────
  const familyAllowances =
    fromField(fields, "family_allowances", "allocations_familiales", "kinderzulagen") ||
    extractByLabel(text, [
      /dont\s+allocations?\s+familiales?\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /allocations?\s+familiales?\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /kinderzulagen\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /familienzulagen\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // ── Case 10.1 : AVS/AI/APG ─────────────────────────────────────────────────
  const avsContributions =
    fromField(fields, "avs_contributions", "avs_ai_apg", "ahv_iv_eo") ||
    extractByCaseNumber(text, "10.1") ||
    extractByLabel(text, [
      /\b10\.1\b[^0-9\n]*?([\d'][^a-zA-Z\n]{0,20})/i,
      /avs\s*\/\s*ai\s*\/\s*ap[gr]?\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /ahv\s*\/\s*iv\s*\/\s*eo\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /cotisations?\s+avs\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // ── Case 10.2 : AC / LACI ──────────────────────────────────────────────────
  const acContributions =
    fromField(fields, "ac_contributions", "ac_laci", "alv_avig") ||
    extractByCaseNumber(text, "10.2") ||
    extractByLabel(text, [
      /\b10\.2\b[^0-9\n]*?([\d'][^a-zA-Z\n]{0,20})/i,
      // "AC" seul est ambigu — contexte requis
      /\bac\b\s*(?:\/\s*laci\s*)?[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /alv\s*(?:\/\s*avig\s*)?[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /assurance[- ]chômage\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /arbeitslosenversicherung\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // ── Case 10.3 : AANP / LAA ────────────────────────────────────────────────
  const aanpContributions =
    fromField(fields, "aanp_contributions", "aanp_laa", "nbuv_uvg") ||
    extractByCaseNumber(text, "10.3") ||
    extractByLabel(text, [
      /\b10\.3\b[^0-9\n]*?([\d'][^a-zA-Z\n]{0,20})/i,
      /aanp\s*(?:\/\s*laa\s*)?[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /nbuv\s*(?:\/\s*uvg\s*)?[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /accident\s+non\s+professionnel\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /nichtberufsunfallversicherung\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // ── Case 11 : LPP / 2ème pilier ───────────────────────────────────────────
  const lppContributions =
    fromField(fields, "lpp_contributions", "lpp_lflp", "bvg_fzg") ||
    extractByCaseNumber(text, "11") ||
    extractByLabel(text, [
      /\b11\b[^0-9\n]*?(?:lpp|bvg|2[eè]me\s+pilier|prévoyance)[^0-9\n]*?([\d'][^a-zA-Z\n]{0,20})/i,
      /\blpp\b\s*(?:\/\s*(?:lflp|2[eè]me\s+pilier)\s*)?[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /\bbvg\b\s*(?:\/\s*fzg\s*)?[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /2[eè]me\s+pilier\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /cotisations?\s+lpp\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // ── Case 13 : Impôt à la source ────────────────────────────────────────────
  const sourceWithholding =
    fromField(fields, "source_withholding", "impot_source", "quellensteuer") ||
    extractByCaseNumber(text, "13") ||
    extractByLabel(text, [
      // Attention : "13" seul peut aussi matcher "13.1", "13.2", "13.3"
      /(?:impôt|impot)\s+à\s+la\s+source\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
      /quellensteuer\s*[:.]*\s*([\d'][^a-zA-Z\n]{0,20})/i,
    ]);

  // ── Cases 13.1 / 13.2 / 13.3 : Frais professionnels ──────────────────────
  const expenses131 =
    fromField(fields, "expenses_representation", "frais_representation") ||
    extractByCaseNumber(text, "13.1") ||
    0;

  const expenses132 =
    fromField(fields, "expenses_car", "frais_voiture") ||
    extractByCaseNumber(text, "13.2") ||
    0;

  const expenses133 =
    fromField(fields, "expenses_other", "autres_frais") ||
    extractByCaseNumber(text, "13.3") ||
    0;

  const expenseReimbursements = expenses131 + expenses132 + expenses133;

  // ── Métadonnées ────────────────────────────────────────────────────────────

  // Numéro AVS (format officiel : 756.XXXX.XXXX.XX)
  const avsMatch = text.match(/\b756\.(\d{4})\.(\d{4})\.(\d{2})\b/);
  const employeeAvsNumber = avsMatch ? avsMatch[0] : fields["avs_number"] ?? undefined;

  // Taux d'occupation (ex: "100 %", "80%", "Taux: 80%")
  const activityRateMatch = text.match(
    /(?:taux\s+d[''']?activit[eé]|taux\s+d[''']?occupation|besch[aä]ftigungsgrad)\s*[:.]*\s*(\d{1,3})\s*%/i
  ) ?? text.match(/(\d{1,3})\s*%\s*(?:d[''']?activit[eé]|occupation)/i);
  const activityRate = activityRateMatch ? parseInt(activityRateMatch[1]) : undefined;

  // Période d'activité
  const periodMatch = text.match(
    /(?:du|vom|p[eé]riode)\s+(\d{2}\.\d{2}\.\d{4})\s+(?:au|bis|[aà]u?)\s+(\d{2}\.\d{2}\.\d{4})/i
  );
  const periodFrom = periodMatch?.[1] ?? undefined;
  const periodTo = periodMatch?.[2] ?? undefined;

  // Nom employeur
  const employer =
    fields["employer"] ??
    (text.match(/(?:employeur|arbeitgeber)[:\s]+([^\n,]+)/i)?.[1] ?? "").trim();

  // Nom employé
  const rawEmployeeName =
    fields["employee_name"] ??
    (text.match(/(?:travailleur|employ[eé]|arbeitnehmer)[:\s]+([^\n]+)/i)?.[1] ?? "").trim();
  const employeeName = rawEmployeeName || undefined;

  // Année fiscale
  const yearMatch = text.match(/\b(202[0-9])\b/g);
  const year = yearMatch
    ? Math.max(...yearMatch.map(Number))
    : parseInt(fields["year"] ?? "2025");

  // Canton (détecté sur NPA/localité ou champ explicite)
  const canton =
    fields["canton"] ??
    (text.match(/\bGE\b|\bGenève\b|\bGenf\b/i) ? "GE" : "GE");

  // ── Score de confiance ─────────────────────────────────────────────────────
  // Basé sur le nombre de champs clés correctement extraits
  let found = 0;
  const total = 5; // champs critiques
  if (grossSalary > 0) found++;
  if (avsContributions > 0) found++;
  if (acContributions > 0) found++;
  if (lppContributions > 0) found++;
  if (employer) found++;

  // Bonus si données structurées Document AI disponibles
  const hasStructuredFields = Object.keys(fields).length > 3;
  const baseConfidence = found / total;
  const confidence = hasStructuredFields
    ? Math.min(0.98, baseConfidence + 0.15)
    : baseConfidence * 0.85; // texte brut = moins fiable

  const data: SalaryCertificateData = {
    _type: "salary_cert",
    grossSalary,
    familyAllowances,
    avsContributions,
    acContributions,
    aanpContributions,
    lppContributions,
    sourceWithholding,
    expenseReimbursements,
    employer,
    employeeName: employeeName || undefined,
    employeeAvsNumber,
    activityRate,
    canton,
    year,
    periodFrom,
    periodTo,
  };

  return { data, confidence };
}
