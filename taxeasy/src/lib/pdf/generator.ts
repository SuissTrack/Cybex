/**
 * PDF Generator — fills GeTax official form PDFs with declaration data.
 * Uses pdf-lib to overlay form fields onto the blank official PDFs.
 *
 * Official blank PDFs are stored in /public/forms/
 * and loaded server-side at generation time.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs/promises";
import { ComputedTax, DeclarationAnswers } from "@/types/declaration";
import { formatCHF } from "@/lib/utils/currency";

export interface PdfGenerationInput {
  answers: DeclarationAnswers;
  computedTax: ComputedTax;
  userName: string;
  userEmail: string;
  commune: string;
  taxYear: number;
}

/**
 * Load an official blank PDF form from /public/forms/
 */
async function loadBlankForm(formName: string): Promise<PDFDocument> {
  const formPath = path.join(process.cwd(), "public", "forms", formName);
  let bytes: Uint8Array;
  try {
    bytes = await fs.readFile(formPath);
  } catch {
    // If official form not available, create a minimal PDF
    const doc = await PDFDocument.create();
    doc.addPage();
    return doc;
  }
  return PDFDocument.load(bytes);
}

/**
 * Generate the Page de Garde 1 (PG1) — état civil, revenus principaux.
 */
export async function generatePG1(input: PdfGenerationInput): Promise<Uint8Array> {
  const doc = await loadBlankForm("icc-2025-pg1.pdf");
  const pages = doc.getPages();
  const page = pages[0];
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const draw = (text: string, x: number, y: number, size = 10, bold = false) => {
    page.drawText(text, {
      x,
      y: height - y,
      size,
      font: bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  // Header
  draw("DÉCLARATION D'IMPÔT 2025 — GENÈVE", 50, 80, 12, true);
  draw(`Contribuable : ${input.userName}`, 50, 105, 10);
  draw(`Commune : ${input.commune}`, 50, 120, 10);

  // Situation familiale
  const familyLabels: Record<string, string> = {
    single: "Célibataire",
    married: "Marié(e)",
    divorced: "Divorcé(e)",
    widowed: "Veuf/Veuve",
  };
  draw(
    `Situation familiale : ${familyLabels[input.answers.family_status ?? "single"] ?? ""}`,
    50, 145, 10
  );

  // Revenus
  const icc = input.computedTax.icc;
  draw("REVENUS", 50, 185, 11, true);
  draw(`Revenu brut : ${formatCHF(icc.grossIncome)}`, 50, 205, 10);
  draw(`Revenu net imposable ICC : ${formatCHF(icc.netIncome)}`, 50, 220, 10);

  // Impôts calculés
  draw("IMPÔTS CALCULÉS (ESTIMATION)", 50, 265, 11, true);
  draw(`ICC cantonal : ${formatCHF(icc.cantonalTax)}`, 50, 285, 10);
  draw(`ICC communal (${input.commune}) : ${formatCHF(icc.communalTax)}`, 50, 300, 10);
  draw(`IFD : ${formatCHF(input.computedTax.ifd.tax)}`, 50, 315, 10);
  draw(`Fortune : ${formatCHF(input.computedTax.fortune.total)}`, 50, 330, 10);
  draw(
    `TOTAL ESTIMÉ : ${formatCHF(input.computedTax.total)}`,
    50, 355, 12, true
  );

  // Footer
  draw(
    `Généré par TaxEasy — ${new Date().toLocaleDateString("fr-CH")}`,
    50,
    height - 30,
    8
  );
  draw(
    "Ce document est une estimation. La déclaration officielle doit être soumise via GeTax.",
    50,
    height - 15,
    7
  );

  return doc.save();
}

/**
 * Generate a summary PDF combining all sections.
 */
export async function generateFullSummaryPDF(
  input: PdfGenerationInput
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();
  const pg1Bytes = await generatePG1(input);
  const pg1 = await PDFDocument.load(pg1Bytes);
  const [firstPage] = await mergedDoc.copyPages(pg1, pg1.getPageIndices());
  mergedDoc.addPage(firstPage);

  // Add a deductions detail page
  const deductionsPage = mergedDoc.addPage();
  const { height } = deductionsPage.getSize();
  const font = await mergedDoc.embedFont(StandardFonts.Helvetica);
  const bold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

  deductionsPage.drawText("DÉDUCTIONS DÉTAILLÉES", {
    x: 50, y: height - 80, size: 14, font: bold, color: rgb(0, 0, 0),
  });

  const icc = input.computedTax.icc;
  const deductions = [
    ["AVS/AI/AC/LPP obligatoires", formatCHF(icc.deductions.avs + icc.deductions.lpp)],
    ["Frais professionnels", formatCHF(icc.deductions.professionalExpenses)],
    ["Transport", formatCHF(icc.deductions.transport)],
    ["Repas", formatCHF(icc.deductions.meals)],
    ["Formation", formatCHF(icc.deductions.training)],
    ["3ème pilier A", formatCHF(icc.deductions.pillar3a)],
    ["3ème pilier B (ICC)", formatCHF(icc.deductions.pillar3b)],
    ["LAMal", formatCHF(icc.deductions.lamal)],
    ["Enfants", formatCHF(icc.deductions.children)],
    ["Frais de garde/camps", formatCHF(icc.deductions.childcare)],
    ["Frais médicaux", formatCHF(icc.deductions.medical)],
    ["Dons", formatCHF(icc.deductions.donations)],
    ["Pensions alimentaires", formatCHF(icc.deductions.alimony)],
    ["Total déductions ICC", formatCHF(icc.deductions.total)],
  ];

  deductions.forEach(([label, amount], i) => {
    const isTotal = label.startsWith("Total");
    deductionsPage.drawText(`${label}`, {
      x: 50, y: height - 120 - i * 22, size: 10,
      font: isTotal ? bold : font, color: rgb(0, 0, 0),
    });
    deductionsPage.drawText(amount, {
      x: 380, y: height - 120 - i * 22, size: 10,
      font: isTotal ? bold : font, color: rgb(0, 0, 0),
    });
  });

  return mergedDoc.save();
}
