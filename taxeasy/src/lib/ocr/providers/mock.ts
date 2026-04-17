/**
 * Mock OCR provider — reproduit fidèlement la sortie d'un vrai OCR
 * sur le formulaire officiel suisse 11 (Lohnausweis / Certificat de salaire AFC/ESTV).
 *
 * Le texte `fullText` imite ce que Google Document AI retournerait
 * après traitement du PDF officiel (lecture colonne de droite, version française).
 *
 * Les `fields` reproduisent les paires clé-valeur structurées que Document AI
 * extrait automatiquement des zones de formulaire.
 */
import { OcrProvider, OcrRawResult } from "../types";

export class MockOcrProvider implements OcrProvider {
  async extractRaw(_fileBuffer: Buffer, _mimeType: string): Promise<OcrRawResult> {
    // Latence simulée (traitement OCR réel ~1–3 s)
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      // ── Texte brut tel qu'extrait par OCR ligne par ligne ─────────────────
      // Reproduit la mise en page du formulaire officiel 11 DFI (version FR)
      fullText: `CERTIFICAT DE SALAIRE / DÉCLARATION DE RENTES ET PENSIONS
Année 2025

EMPLOYEUR
Société Exemple SA
Route de Meyrin 100
1219 Le Lignon
Genève

TRAVAILLEUR / EUSE
Monsieur Jean Dupont
Rue du Rhône 15
1204 Genève

N° AVS: 756.1234.5678.90
Période d'activité: du 01.01.2025 au 31.12.2025
Taux d'activité: 100 %

SALAIRES / RENTES ET PENSIONS

A   Total du salaire brut                                               95'000.00
    dont allocations familiales                                          3'000.00

COTISATIONS SOCIALES ET PRIMES D'ASSURANCE DU TRAVAILLEUR/EUSE

10.1  AVS/AI/APG                                                        5'035.00
10.2  AC                                                                1'045.20
10.3  AANP                                                                285.00
11    LPP / 2ème pilier (cotisations obligatoires)                      9'120.00

RETENUES

13    Impôt à la source retenu                                              0.00

FRAIS PROFESSIONNELS EFFECTIFS (annexe obligatoire)

13.1  Frais de représentation                                               0.00
13.2  Frais de voiture                                                      0.00
13.3  Autres frais                                                          0.00

REMARQUES / OBSERVATIONS

15    Certificat établi conformément à la circulaire AFC 2025

Lieu et date: Genève, le 15.01.2026

Signature de l'employeur: [signé]`,

      // ── Champs structurés (Document AI form field extraction) ─────────────
      // Document AI identifie automatiquement les zones de formulaire imprimées
      fields: {
        // Champs principaux — nommés selon les clés attendues par le parser
        gross_salary:       "95000.00",
        family_allowances:  "3000.00",
        avs_contributions:  "5035.00",
        ac_contributions:   "1045.20",
        aanp_contributions: "285.00",
        lpp_contributions:  "9120.00",
        source_withholding: "0.00",
        // Métadonnées
        employer:           "Société Exemple SA",
        employee_name:      "Jean Dupont",
        avs_number:         "756.1234.5678.90",
        canton:             "GE",
        year:               "2025",
        period_from:        "01.01.2025",
        period_to:          "31.12.2025",
        activity_rate:      "100",
      },

      // Confiance simulée — Document AI dépasse 0.95 sur un formulaire standard propre
      confidence: 0.97,
      provider: "mock",
    };
  }
}
