/**
 * GeTax XML Builder — génère le fichier .tax (XML zippé)
 * Format GeTax version 1.03 (2025)
 *
 * Le fichier .tax est une archive ZIP contenant :
 *  - declaration.xml : les données de la déclaration
 *  - meta.json : métadonnées (version, logiciel source)
 */
import { GeTaxSchema2025 } from "./schema-2025";
import { DeclarationAnswers, ComputedTax } from "@/types/declaration";

/** Convertit centimes en CHF entier (arrondi) */
function c2chf(centimes: number): number {
  return Math.round(centimes / 100);
}

/**
 * Build the GeTax XML string from a declaration.
 */
export function buildGeTaxXml(
  schema: GeTaxSchema2025,
  declarationId: string
): string {
  const { contribuable: c, revenus: r, deductions: d, fortune: f } = schema;

  return `<?xml version="1.0" encoding="UTF-8"?>
<GeTax version="1.03" annee="${schema.annee}" logiciel="TaxEasy" dateGeneration="${new Date().toISOString()}">
  <Declaration id="${declarationId}" annee="${schema.annee}">

    <Contribuable>
      <Nom>${escapeXml(c.nom)}</Nom>
      <Prenom>${escapeXml(c.prenom)}</Prenom>
      <NoAVS>${escapeXml(c.avs)}</NoAVS>
      <Email>${escapeXml(c.email)}</Email>
      <Adresse>${escapeXml(c.adresse)}</Adresse>
      <CodePostal>${escapeXml(c.codePostal)}</CodePostal>
      <Commune>${escapeXml(c.commune)}</Commune>
    </Contribuable>

    <Revenus>
      <Code id="1.1" libelle="Salaire brut">${r.salaireBrut}</Code>
      <Code id="1.2" libelle="Allocations familiales">${r.allocFamiliales}</Code>
      <Code id="2.1" libelle="Revenu accessoire">${r.revenuAccessoire}</Code>
      <Code id="3.1" libelle="Rentes AVS/AI/LPP">${r.rentes}</Code>
      <Code id="4.1" libelle="Dividendes suisses">${r.dividendesCH}</Code>
      <Code id="5.1" libelle="Revenus locatifs">${r.revenusLocatifs}</Code>
    </Revenus>

    <Deductions>
      <Code id="10.1" libelle="Cotisations AVS/AI/AC">${d.cotisationsAvs}</Code>
      <Code id="10.2" libelle="Cotisations LPP obligatoires">${d.cotisationsLpp}</Code>
      <Code id="11.1" libelle="Frais professionnels">${d.fraisPro}</Code>
      <Code id="11.2" libelle="Transport">${d.transport}</Code>
      <Code id="11.3" libelle="Repas">${d.repas}</Code>
      <Code id="12.1" libelle="Rachat LPP">${d.rachatLpp}</Code>
      <Code id="13.1" libelle="Pilier 3A">${d.pilier3a}</Code>
      <Code id="13.2" libelle="Pilier 3B (ICC)">${d.pilier3b}</Code>
      <Code id="14.1" libelle="Primes LAMal">${d.lamal}</Code>
      <Code id="15.1" libelle="Deduction enfants">${d.enfants}</Code>
      <Code id="15.2" libelle="Frais de garde">${d.garde}</Code>
      <Code id="16.1" libelle="Frais medicaux">${d.fraisMedicaux}</Code>
      <Code id="16.2" libelle="Dons">${d.dons}</Code>
      <Code id="17.1" libelle="Pensions alimentaires versees">${d.pensionsVersees}</Code>
    </Deductions>

    <Fortune>
      <Code id="20.1" libelle="Comptes bancaires">${f.comptesBancaires}</Code>
      <Code id="20.2" libelle="Titres">${f.titres}</Code>
      <Code id="20.3" libelle="Immobilier">${f.immobilier}</Code>
      <Code id="20.4" libelle="Vehicules">${f.vehicules}</Code>
      <Code id="20.5" libelle="Autres">${f.autres}</Code>
      <Code id="20.9" libelle="Dettes">${f.dettes}</Code>
    </Fortune>

    ${schema.crv ? `<CRV eglise="${schema.crv}" />` : "<CRV eglise=\"aucune\" />"}

  </Declaration>
</GeTax>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts our internal data structures to GeTaxSchema2025.
 */
export function buildGeTaxSchema(
  answers: DeclarationAnswers,
  computedTax: ComputedTax,
  user: {
    name: string | null;
    email: string;
    avsNumber?: string | null;
    address?: string | null;
    postalCode?: string | null;
  },
  commune: string,
  taxYear: number
): GeTaxSchema2025 {
  const icc = computedTax.icc;
  // ifd reserved for future use (IFD export not yet implemented in GeTax schema)

  const parts = (user.name ?? "").split(" ");
  const prenom = parts.length > 1 ? parts[0] : "";
  const nom = parts.length > 1 ? parts.slice(1).join(" ") : parts[0];

  return {
    contribuable: {
      nom,
      prenom: prenom,
      avs: user.avsNumber ?? "",
      adresse: user.address ?? "",
      commune,
      codePostal: user.postalCode ?? "",
      email: user.email,
    },
    annee: taxYear,
    revenus: {
      salaireBrut: c2chf(icc.grossIncome),
      allocFamiliales: 0, // Intégrées dans le salaire brut dès 2025
      revenuAccessoire: c2chf(answers.side_income ?? 0),
      rentes: c2chf(answers.pension_income ?? 0),
      dividendesCH: c2chf(answers.dividends_amount ?? 0),
      revenusLocatifs: c2chf(
        Math.max(0, (answers.rental_income_amount ?? 0) - (answers.rental_expenses_amount ?? 0))
      ),
    },
    deductions: {
      cotisationsAvs: c2chf(icc.deductions.avs),
      cotisationsLpp: c2chf(icc.deductions.lpp),
      fraisPro: c2chf(icc.deductions.professionalExpenses),
      transport: c2chf(icc.deductions.transport),
      repas: c2chf(icc.deductions.meals),
      rachatLpp: 0,
      pilier3a: c2chf(icc.deductions.pillar3a),
      pilier3b: c2chf(icc.deductions.pillar3b),
      lamal: c2chf(icc.deductions.lamal),
      enfants: c2chf(icc.deductions.children),
      garde: c2chf(icc.deductions.childcare),
      fraisMedicaux: c2chf(icc.deductions.medical),
      dons: c2chf(icc.deductions.donations),
      pensionsVersees: c2chf(icc.deductions.alimony),
    },
    fortune: {
      comptesBancaires: c2chf(answers.wealth_bank ?? 0),
      titres: c2chf(answers.wealth_securities_value ?? 0),
      immobilier: c2chf(answers.wealth_real_estate_value ?? 0),
      vehicules: c2chf(answers.wealth_vehicles_value ?? 0),
      autres: c2chf(answers.wealth_other_assets_value ?? 0),
      dettes: c2chf(answers.wealth_debts_amount ?? 0),
    },
    crv:
      answers.crv === "yes_catholic"
        ? "catholique"
        : answers.crv === "yes_protestant"
        ? "protestant"
        : answers.crv === "yes_other"
        ? "autre"
        : null,
  };
}
