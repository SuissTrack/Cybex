/**
 * Structure XML GeTax 2025 — version 1.03
 * Format .tax (archive ZIP contenant le XML)
 *
 * Les champs correspondent aux codes officiels AFC-GE.
 * Tous les montants en centimes dans notre système → convertis en CHF pour GeTax.
 */

export interface GeTaxSchema2025 {
  /** Informations contribuable */
  contribuable: {
    nom: string;
    prenom: string;
    avs: string;
    adresse: string;
    commune: string;
    codePostal: string;
    email: string;
  };
  /** Année fiscale */
  annee: number;
  /** Revenus (code GeTax : CHF entier) */
  revenus: {
    /** Code 1.1 — Salaire brut */
    salaireBrut: number;
    /** Code 1.2 — Allocations familiales */
    allocFamiliales: number;
    /** Code 2.1 — Revenus activité accessoire */
    revenuAccessoire: number;
    /** Code 3.1 — Rentes AVS/AI/LPP */
    rentes: number;
    /** Code 4.1 — Dividendes suisses */
    dividendesCH: number;
    /** Code 5.1 — Revenus locatifs */
    revenusLocatifs: number;
  };
  /** Déductions (CHF entier) */
  deductions: {
    /** Code 10.1 — Cotisations AVS/AI/AC */
    cotisationsAvs: number;
    /** Code 10.2 — Cotisations LPP obligatoires */
    cotisationsLpp: number;
    /** Code 11.1 — Frais professionnels forfait */
    fraisPro: number;
    /** Code 11.2 — Transport */
    transport: number;
    /** Code 11.3 — Repas */
    repas: number;
    /** Code 12.1 — Rachat LPP volontaire */
    rachatLpp: number;
    /** Code 13.1 — Pilier 3A */
    pilier3a: number;
    /** Code 13.2 — Pilier 3B (ICC uniquement) */
    pilier3b: number;
    /** Code 14.1 — LAMal */
    lamal: number;
    /** Code 15.1 — Enfants à charge */
    enfants: number;
    /** Code 15.2 — Frais de garde */
    garde: number;
    /** Code 16.1 — Frais médicaux */
    fraisMedicaux: number;
    /** Code 16.2 — Dons */
    dons: number;
    /** Code 17.1 — Pensions alimentaires versées */
    pensionsVersees: number;
  };
  /** Fortune (CHF entier) */
  fortune: {
    /** Code 20.1 — Comptes bancaires/postaux */
    comptesBancaires: number;
    /** Code 20.2 — Titres */
    titres: number;
    /** Code 20.3 — Immobilier */
    immobilier: number;
    /** Code 20.4 — Véhicules */
    vehicules: number;
    /** Code 20.5 — Autres éléments */
    autres: number;
    /** Code 20.9 — Dettes */
    dettes: number;
  };
  /** CRV */
  crv: "catholique" | "protestant" | "autre" | null;
}
