/**
 * Smart form filler using Playwright.
 *
 * Strategy:
 * 1. Detect common form fields by label text, name attribute, placeholder
 * 2. Fill standard fields (name, email, phone, cover letter, etc.)
 * 3. For unknown questions, use Claude to generate contextual answers
 * 4. Upload CV to file inputs
 * 5. Click submit
 */
import { Page } from 'playwright';
import { generateFormAnswer } from '../lib/claude';
import { logger } from '../lib/logger';

interface Profile {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  cvParsedText?: string | null;
}

interface FormFillerParams {
  profile: Profile & { user?: { email?: string } };
  coverLetter: string;
  cvPath: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
}

interface FormFillerResult {
  fieldsFound: number;
  fieldsFilled: number;
  submitted: boolean;
  customAnswers?: Record<string, string>;
}

// ── Field detection heuristics ────────────────────────────────────────────────
const FIELD_MAP: Record<string, { patterns: string[]; value: (p: Profile & { email?: string }) => string }> = {
  firstName: {
    patterns: ['first.?name', 'prénom', 'vorname', 'nome'],
    value: (p) => p.firstName ?? '',
  },
  lastName: {
    patterns: ['last.?name', 'surname', 'nom', 'nachname', 'cognome'],
    value: (p) => p.lastName ?? '',
  },
  fullName: {
    patterns: ['full.?name', 'nom.?complet', 'your.?name'],
    value: (p) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
  },
  email: {
    patterns: ['email', 'e-mail', 'courriel', 'mail'],
    value: (p) => p.email ?? '',
  },
  phone: {
    patterns: ['phone', 'téléphone', 'mobile', 'tel', 'handynummer'],
    value: (p) => p.phone ?? '',
  },
  location: {
    patterns: ['location', 'adresse', 'ville', 'city', 'ort', 'lieu'],
    value: (p) => p.location ?? '',
  },
  linkedin: {
    patterns: ['linkedin', 'profil.?linkedin'],
    value: (p) => p.linkedinUrl ?? '',
  },
  portfolio: {
    patterns: ['portfolio', 'website', 'site.?web', 'github'],
    value: (p) => p.portfolioUrl ?? '',
  },
  coverLetter: {
    patterns: [
      'cover.?letter', 'lettre.?de.?motivation', 'motivation', 'anschreiben',
      'why.?do.?you', 'pourquoi', 'tell.?us', 'dites.?nous',
    ],
    value: () => '', // filled separately
  },
};

function matchesPattern(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => new RegExp(p, 'i').test(lower));
}

async function getLabelForInput(page: Page, inputHandle: unknown): Promise<string> {
  return page.evaluate((input) => {
    const el = input as HTMLInputElement;
    // Check aria-label
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')!;
    // Check placeholder
    if (el.placeholder) return el.placeholder;
    // Check name/id
    if (el.name) return el.name;
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) return label.textContent?.trim() ?? '';
    }
    // Check parent label
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent?.trim() ?? '';
    return '';
  }, inputHandle);
}

export async function fillForm(
  page: Page,
  params: FormFillerParams,
): Promise<FormFillerResult> {
  const { profile, coverLetter, cvPath, jobTitle, company, jobDescription } = params;

  const profileWithEmail = {
    ...profile,
    email: (profile as unknown as { user?: { email: string } }).user?.email ?? '',
  };

  let fieldsFound = 0;
  let fieldsFilled = 0;
  const customAnswers: Record<string, string> = {};

  // ── Text inputs & textareas ───────────────────────────────────────────────
  const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea');
  fieldsFound = inputs.length;

  for (const input of inputs) {
    try {
      const label = await getLabelForInput(page, input);
      if (!label) continue;

      let filled = false;

      // Check standard fields
      for (const [fieldKey, fieldDef] of Object.entries(FIELD_MAP)) {
        if (matchesPattern(label, fieldDef.patterns)) {
          if (fieldKey === 'coverLetter') {
            await input.fill(coverLetter);
          } else {
            const val = fieldDef.value(profileWithEmail);
            if (val) await input.fill(val);
            else continue;
          }
          filled = true;
          break;
        }
      }

      // Unknown question → ask Claude
      if (!filled && label.length > 5 && label.endsWith('?')) {
        logger.info(`Form filler: unknown question detected: "${label}"`);
        const answer = await generateFormAnswer({
          question: label,
          jobTitle,
          company,
          cvText: profile.cvParsedText ?? '',
        });

        const tag = await input.evaluate((el) => el.tagName);
        if (tag === 'TEXTAREA' || tag === 'INPUT') {
          await (input as ReturnType<typeof page.$> extends Promise<infer T> ? T : never).fill(answer);
          customAnswers[label] = answer;
          filled = true;
        }
      }

      if (filled) fieldsFilled++;
    } catch (err) {
      logger.warn('Form filler: could not fill input', { err });
    }
  }

  // ── File upload (CV) ───────────────────────────────────────────────────────
  const fileInputs = await page.$$('input[type="file"]');
  for (const fileInput of fileInputs) {
    try {
      await fileInput.setInputFiles(cvPath);
      logger.info('Form filler: CV uploaded');
      fieldsFilled++;
      await page.waitForTimeout(1000);
    } catch (err) {
      logger.warn('Form filler: could not upload CV', { err });
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Submit")',
    'button:has-text("Envoyer")',
    'button:has-text("Postuler")',
    'button:has-text("Soumettre")',
    'button:has-text("Apply")',
    'button:has-text("Send Application")',
    '[class*="submit"]',
  ];

  let submitted = false;
  for (const sel of submitSelectors) {
    const btn = await page.$(sel).catch(() => null);
    if (btn) {
      try {
        await btn.click();
        await page.waitForTimeout(3000);
        submitted = true;
        logger.info(`Form filler: submitted via "${sel}"`);
        break;
      } catch (err) {
        logger.warn(`Form filler: failed to click submit "${sel}"`, { err });
      }
    }
  }

  return {
    fieldsFound,
    fieldsFilled,
    submitted,
    customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
  };
}
