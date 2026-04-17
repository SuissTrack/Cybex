/**
 * Tests unitaires — parseSalaryCertificate
 *
 * Couvre :
 *   - chfToCentimes   : tous les formats CHF du formulaire officiel
 *   - extractByCaseNumber : cas typiques, cas limites, numéros similaires
 *   - parseSalaryCertificate : intégration complète des 3 stratégies d'extraction
 *     (Document AI fields → numéros de case → libellés texte)
 */

import { describe, it, expect } from "vitest";
import { parseSalaryCertificate } from "@/lib/ocr/parsers/salary-certificate";
import type { OcrRawResult, ParsedDocument } from "@/lib/ocr/types";
import type { SalaryCertificateData } from "@/types/document";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Construit un OcrRawResult minimal autour d'un texte brut. */
function fromText(fullText: string): OcrRawResult {
  return { fullText, fields: {}, confidence: 0, provider: "mock" };
}

/** Construit un OcrRawResult avec des champs structurés (Document AI). */
function fromFields(fields: Record<string, string>, fullText = ""): OcrRawResult {
  return { fullText, fields, confidence: 0, provider: "mock" };
}

/**
 * Narrow ParsedDocument.data to SalaryCertificateData.
 * The test only calls this after verifying the result is not null and _type is salary_cert.
 */
function asSalaryCert(doc: ParsedDocument): SalaryCertificateData {
  if (doc.data._type !== "salary_cert") {
    throw new Error(`Expected salary_cert, got ${doc.data._type}`);
  }
  return doc.data;
}

// ─── chfToCentimes ────────────────────────────────────────────────────────────
// La fonction est privée ; on la teste via parseSalaryCertificate en lui
// fournissant des textes au format exact du formulaire.

describe("format CHF — parsing via champs structurés", () => {
  it.each([
    // [description, montant en string, centimes attendus]
    ["95'000.00 (apostrophe typographique)", "95'000.00", 9_500_000],
    ["95 000.00 (espace insécable)", "95\u00a0000.00", 9_500_000],
    ["95 000.00 (espace ordinaire)", "95 000.00", 9_500_000],
    ["95000.00 (sans séparateur)", "95000.00", 9_500_000],
    ["95'000.- (tiret court)", "95'000.-", 9_500_000],
    ["95'000.– (tiret long EN DASH)", "95'000.\u2013", 9_500_000],
    ["9'120.00 (4 chiffres)", "9'120.00", 912_000],
    ["9120.- (sans apostrophe)", "9120.-", 912_000],
    ["9120 (entier sans décimale)", "9120", 912_000],
    ["9120,00 (virgule décimale)", "9120,00", 912_000],
    ["0.00 → 0 centimes", "0.00", 0],
    ["chaîne vide → 0", "", 0],
  ])("%s", (_, montantStr, attendu) => {
    const raw = fromFields({ gross_salary: montantStr });
    const result = parseSalaryCertificate(raw);
    // Si le montant est 0, parseSalaryCertificate renvoie null (sans salaire = pas un CS)
    if (attendu === 0) {
      expect(result).toBeNull();
    } else {
      expect(result).not.toBeNull();
      expect(asSalaryCert(result!).grossSalary).toBe(attendu);
    }
  });
});

// ─── Extraction par numéro de case ───────────────────────────────────────────

describe("extraction par numéro de case officiel", () => {
  // Formulaire réel : numéro en début de ligne, montant aligné à droite
  const textFormatTableau = `
Certificat de salaire 2025

A      Total du salaire brut .......................   95'000.00
10.1   AVS/AI/APG (part employé) ..................    5'035.00
10.2   AC — Assurance chômage ....................      855.00
10.3   AANP — Accident non professionnel .........      142.50
11     LPP / 2ème pilier ..........................    4'800.00
13     Impôt à la source ..........................        0.00
13.1   Frais de représentation ....................    2'400.00
13.2   Frais de voiture ...........................    1'200.00
13.3   Autres frais professionnels ................      600.00
`;

  it("case A — salaire brut", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    expect(result).not.toBeNull();
    expect(asSalaryCert(result!).grossSalary).toBe(9_500_000);
  });

  it("case 10.1 — AVS/AI/APG", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    expect(asSalaryCert(result!).avsContributions).toBe(503_500);
  });

  it("case 10.2 — AC", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    expect(asSalaryCert(result!).acContributions).toBe(85_500);
  });

  it("case 10.3 — AANP", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    expect(asSalaryCert(result!).aanpContributions).toBe(14_250);
  });

  it("case 11 — LPP", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    expect(asSalaryCert(result!).lppContributions).toBe(480_000);
  });

  it("cases 13.1 + 13.2 + 13.3 → expenseReimbursements = 4'200", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    // 2'400 + 1'200 + 600 = 4'200 CHF = 420'000 centimes
    expect(asSalaryCert(result!).expenseReimbursements).toBe(420_000);
  });

  it("case 13 impôt source = 0 ne déclenche pas de faux positif", () => {
    const result = parseSalaryCertificate(fromText(textFormatTableau));
    expect(asSalaryCert(result!).sourceWithholding).toBe(0);
  });
});

describe("extraction par numéro de case — cas limites", () => {
  it("ne confond pas '11' avec '10.1', '10.2', '10.3'", () => {
    const text = `
A      Salaire brut ........ 80'000.00
10.1   AVS .................. 4'240.00
10.2   AC ....................   880.00
10.3   AANP ..................   120.00
11     LPP ................... 3'600.00
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).lppContributions).toBe(360_000);
    expect(asSalaryCert(r!).avsContributions).toBe(424_000);
  });

  it("ne confond pas '13' avec '13.1', '13.2', '13.3'", () => {
    const text = `
A      Salaire brut ........ 60'000.00
13     Impôt source ......... 8'500.00
13.1   Frais représent. .....   600.00
13.2   Frais voiture .........   300.00
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).sourceWithholding).toBe(850_000);
    expect(asSalaryCert(r!).expenseReimbursements).toBe(90_000); // 600 + 300
  });

  it("retourne null si case A absente (pas un certificat de salaire)", () => {
    const text = "10.1  AVS ........ 5'000.00\n10.2  AC .........   500.00";
    expect(parseSalaryCertificate(fromText(text))).toBeNull();
  });
});

// ─── Extraction par libellé texte (fallback FR/DE) ───────────────────────────

describe("extraction par libellé texte bilingue (FR)", () => {
  const textFR = `
Total du salaire brut : 72'000.00
AVS/AI/APG : 3'816.00
Assurance chômage : 792.00
LPP : 3'200.00
Dont allocations familiales : 3'600.00
`;

  it("salaire brut par libellé FR", () => {
    const r = parseSalaryCertificate(fromText(textFR));
    expect(asSalaryCert(r!).grossSalary).toBe(7_200_000);
  });

  it("AVS par libellé FR", () => {
    const r = parseSalaryCertificate(fromText(textFR));
    expect(asSalaryCert(r!).avsContributions).toBe(381_600);
  });

  it("AC par libellé 'Assurance chômage'", () => {
    const r = parseSalaryCertificate(fromText(textFR));
    expect(asSalaryCert(r!).acContributions).toBe(79_200);
  });

  it("LPP par libellé simple", () => {
    const r = parseSalaryCertificate(fromText(textFR));
    expect(asSalaryCert(r!).lppContributions).toBe(320_000);
  });

  it("allocations familiales par libellé 'Dont allocations familiales'", () => {
    const r = parseSalaryCertificate(fromText(textFR));
    expect(asSalaryCert(r!).familyAllowances).toBe(360_000);
  });
});

describe("extraction par libellé texte bilingue (DE)", () => {
  const textDE = `
Total Bruttolohn : 88'400.00
AHV/IV/EO : 4'685.20
ALV : 972.40
BVG : 4'200.00
`;

  it("salaire brut par libellé 'Bruttolohn'", () => {
    const r = parseSalaryCertificate(fromText(textDE));
    expect(asSalaryCert(r!).grossSalary).toBe(8_840_000);
  });

  it("AVS par libellé 'AHV/IV/EO'", () => {
    const r = parseSalaryCertificate(fromText(textDE));
    expect(asSalaryCert(r!).avsContributions).toBe(468_520);
  });

  it("AC par libellé 'ALV'", () => {
    const r = parseSalaryCertificate(fromText(textDE));
    expect(asSalaryCert(r!).acContributions).toBe(97_240);
  });

  it("LPP par libellé 'BVG'", () => {
    const r = parseSalaryCertificate(fromText(textDE));
    expect(asSalaryCert(r!).lppContributions).toBe(420_000);
  });
});

// ─── Priorité Document AI > numéro de case > libellé ─────────────────────────

describe("priorité d'extraction : Document AI prend le dessus", () => {
  it("le champ structuré gross_salary écrase le texte brut", () => {
    // Le texte dit 80'000, les champs structurés disent 100'000
    const raw: OcrRawResult = {
      fullText: "A  Salaire brut ...... 80'000.00",
      fields: { gross_salary: "100'000.00" },
      confidence: 0,
      provider: "mock",
    };
    const r = parseSalaryCertificate(raw);
    expect(asSalaryCert(r!).grossSalary).toBe(10_000_000);
  });

  it("champ avs_contributions prime sur extraction texte", () => {
    const raw: OcrRawResult = {
      fullText: "A  Salaire brut 90'000.00\n10.1  AVS .... 4'000.00",
      fields: { gross_salary: "90'000.00", avs_contributions: "4'770.00" },
      confidence: 0,
      provider: "mock",
    };
    const r = parseSalaryCertificate(raw);
    expect(asSalaryCert(r!).avsContributions).toBe(477_000);
  });
});

// ─── Métadonnées extraites ────────────────────────────────────────────────────

describe("extraction des métadonnées", () => {
  it("numéro AVS au format officiel 756.XXXX.XXXX.XX", () => {
    const text = `
A  Salaire brut ... 50'000.00
No AVS : 756.1234.5678.90
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).employeeAvsNumber).toBe("756.1234.5678.90");
  });

  it("numéro AVS absent → undefined", () => {
    const text = "A  Salaire brut ... 50'000.00";
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).employeeAvsNumber).toBeUndefined();
  });

  it("taux d'activité 80%", () => {
    const text = `
A  Salaire brut ... 50'000.00
Taux d'activité : 80 %
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).activityRate).toBe(80);
  });

  it("taux d'activité 100% (plein temps)", () => {
    const text = `
A  Salaire brut ... 120'000.00
Taux d'occupation : 100 %
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).activityRate).toBe(100);
  });

  it("taux d'activité absent → undefined", () => {
    const text = "A  Salaire brut ... 50'000.00";
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).activityRate).toBeUndefined();
  });

  it("période d'activité du 01.01.2025 au 31.12.2025", () => {
    const text = `
A  Salaire brut ... 90'000.00
Du 01.01.2025 au 31.12.2025
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).periodFrom).toBe("01.01.2025");
    expect(asSalaryCert(r!).periodTo).toBe("31.12.2025");
  });

  it("période absente → undefined", () => {
    const text = "A  Salaire brut ... 90'000.00";
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).periodFrom).toBeUndefined();
    expect(asSalaryCert(r!).periodTo).toBeUndefined();
  });

  it("année fiscale extraite du texte (max si plusieurs années mentionnées)", () => {
    const text = `
A  Salaire brut ... 90'000.00
Certificat de salaire 2025
Référence interne : exercice 2024
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).year).toBe(2025);
  });

  it("employeur extrait par libellé", () => {
    const raw = fromFields(
      { employer: "Entreprise SA" },
      "A  Salaire brut ... 90'000.00"
    );
    const r = parseSalaryCertificate(raw);
    expect(asSalaryCert(r!).employer).toBe("Entreprise SA");
  });

  it("nom employé extrait par champ structuré", () => {
    const raw = fromFields(
      { employee_name: "Jean-Marie Dupont", gross_salary: "75'000.00" }
    );
    const r = parseSalaryCertificate(raw);
    expect(asSalaryCert(r!).employeeName).toBe("Jean-Marie Dupont");
  });
});

// ─── Score de confiance ───────────────────────────────────────────────────────

describe("score de confiance", () => {
  it("confiance élevée avec champs Document AI (> 3 champs)", () => {
    const raw = fromFields({
      gross_salary: "100'000.00",
      avs_contributions: "5'300.00",
      ac_contributions: "1'100.00",
      lpp_contributions: "5'000.00",
      employer: "UBS SA",
    });
    const r = parseSalaryCertificate(raw);
    // 5/5 champs trouvés + bonus Document AI → confiance ≥ 0.95
    expect(r!.confidence).toBeGreaterThanOrEqual(0.95);
    expect(r!.confidence).toBeLessThanOrEqual(1);
  });

  it("confiance faible avec texte brut incomplet (1 champ sur 5)", () => {
    const text = "A  Salaire brut ... 50'000.00";
    const r = parseSalaryCertificate(fromText(text));
    // 1/5 champs × 0.85 (pénalité texte brut) = 0.17
    expect(r!.confidence).toBeLessThan(0.5);
  });

  it("confiance intermédiaire avec 3 champs texte sur 5", () => {
    const text = `
A    Salaire brut .... 80'000.00
10.1 AVS .............. 4'240.00
10.2 AC .................  880.00
Employeur: Société Anonyme SA
`;
    const r = parseSalaryCertificate(fromText(text));
    // 4/5 × 0.85 ≈ 0.68
    expect(r!.confidence).toBeGreaterThanOrEqual(0.5);
    expect(r!.confidence).toBeLessThan(0.95);
  });
});

// ─── Cas réels complets ───────────────────────────────────────────────────────

describe("scénarios complets", () => {
  it("certificat salarié genevois typique 2025 — tous champs extraits", () => {
    const text = `
CERTIFICAT DE SALAIRE 2025

Employeur : Banque Cantonale de Genève
Employé   : Sophie Rochat
AVS       : 756.9876.5432.10
Du 01.01.2025 au 31.12.2025
Taux d'activité : 100 %

A      Total du salaire brut ......................  120'000.00
       dont allocations familiales ................    3'600.00
10.1   AVS/AI/APG .................................    6'360.00
10.2   AC ..........................................    1'320.00
10.3   AANP ........................................      180.00
11     LPP .........................................    7'200.00
13     Impôt à la source ..........................   18'000.00
13.1   Frais de représentation ....................    2'400.00
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(r).not.toBeNull();

    const d = asSalaryCert(r!);
    expect(d._type).toBe("salary_cert");
    expect(d.grossSalary).toBe(12_000_000);
    expect(d.familyAllowances).toBe(360_000);
    expect(d.avsContributions).toBe(636_000);
    expect(d.acContributions).toBe(132_000);
    expect(d.aanpContributions).toBe(18_000);
    expect(d.lppContributions).toBe(720_000);
    expect(d.sourceWithholding).toBe(1_800_000);
    expect(d.expenseReimbursements).toBe(240_000); // uniquement 13.1
    expect(d.employer).toBe("Banque Cantonale de Genève");
    expect(d.employeeAvsNumber).toBe("756.9876.5432.10");
    expect(d.activityRate).toBe(100);
    expect(d.periodFrom).toBe("01.01.2025");
    expect(d.periodTo).toBe("31.12.2025");
    expect(d.year).toBe(2025);
  });

  it("certificat temps partiel 60% — taux d'activité détecté", () => {
    const text = `
A      Salaire brut .... 48'000.00
10.1   AVS ............... 2'544.00
Taux d'occupation : 60 %
Employeur: Fondation XY
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).activityRate).toBe(60);
    expect(asSalaryCert(r!).grossSalary).toBe(4_800_000);
  });

  it("formulaire bilingue FR/DE — champs DE prioritaires sur labels FR absents", () => {
    const text = `
Lohnausweis 2025 / Certificat de salaire 2025

Total Bruttolohn ......... 95'000.00
AHV/IV/EO ................  5'035.00
ALV ......................    1'045.00
NBUV .....................      285.00
BVG ......................    4'750.00
`;
    const r = parseSalaryCertificate(fromText(text));
    expect(asSalaryCert(r!).grossSalary).toBe(9_500_000);
    expect(asSalaryCert(r!).avsContributions).toBe(503_500);
    expect(asSalaryCert(r!).acContributions).toBe(104_500);
    expect(asSalaryCert(r!).aanpContributions).toBe(28_500);
    expect(asSalaryCert(r!).lppContributions).toBe(475_000);
  });

  it("document vide → null", () => {
    expect(parseSalaryCertificate(fromText(""))).toBeNull();
  });

  it("document sans montant de salaire → null", () => {
    const text = `
Nom : Jean Dupont
Employeur : ACME SA
Année : 2025
`;
    expect(parseSalaryCertificate(fromText(text))).toBeNull();
  });
});
