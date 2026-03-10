/**
 * Automated Job Application Engine
 *
 * Orchestrates the end-to-end application flow:
 * 1. Load profile + job data
 * 2. Generate cover letter with Claude
 * 3. Navigate to the apply URL
 * 4. Detect form type and fill fields
 * 5. Upload CV
 * 6. Submit and verify
 * 7. Log every step to the DB
 */
import fs from 'fs';
import { getBrowser, newStealthContext, takeScreenshot } from '../lib/browser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { generateCoverLetter } from '../lib/claude';
import { fillForm } from './formFiller';

interface RunApplicationParams {
  applicationId: string;
  userId: string;
  jobId: string;
}

async function log(
  applicationId: string,
  level: 'INFO' | 'WARN' | 'ERROR',
  step: string,
  message: string,
  payload?: object,
  screenshotPath?: string,
) {
  await prisma.automationLog.create({
    data: { applicationId, level, step, message, payload, screenshotPath },
  }).catch((e) => logger.error('Failed to write automation log', { e }));
}

export async function runApplication(params: RunApplicationParams): Promise<void> {
  const { applicationId, userId, jobId } = params;

  // ── Load data ───────────────────────────────────────────────────────────────
  const [application, job, profile] = await Promise.all([
    prisma.application.findUnique({ where: { id: applicationId } }),
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.profile.findUnique({
      where: { userId },
      include: { preferences: true },
    }),
  ]);

  if (!application || !job || !profile) {
    throw new Error('Missing application, job, or profile data');
  }
  if (!profile.cvPath || !fs.existsSync(profile.cvPath)) {
    throw new Error('CV file not found');
  }

  await log(applicationId, 'INFO', 'start', `Starting application for "${job.title}" at ${job.company}`);

  // ── Generate cover letter ───────────────────────────────────────────────────
  await log(applicationId, 'INFO', 'generate_cover_letter', 'Generating cover letter with Claude');

  const candidateName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Candidat';
  const language: 'fr' | 'en' = job.currency === 'CHF' && !job.location?.includes('Zurich') ? 'fr' : 'fr';

  const coverLetter = await generateCoverLetter({
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    candidateName,
    cvText: profile.cvParsedText ?? '',
    language,
  });

  await prisma.application.update({
    where: { id: applicationId },
    data: { coverLetter, status: 'APPLYING' },
  });

  await log(applicationId, 'INFO', 'cover_letter_done', 'Cover letter generated', {
    length: coverLetter.length,
  });

  // ── Launch browser ─────────────────────────────────────────────────────────
  const browser = await getBrowser();
  const context = await newStealthContext(browser);
  const page = await context.newPage();
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

  try {
    await log(applicationId, 'INFO', 'navigate', `Navigating to ${job.applyUrl}`);
    await page.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout });

    const screenshotPath = await takeScreenshot(page, `app_${applicationId}_landing`);
    await log(applicationId, 'INFO', 'page_loaded', 'Apply page loaded', {}, screenshotPath ?? undefined);

    // ── Fill the form ─────────────────────────────────────────────────────────
    const formResult = await fillForm(page, {
      profile,
      coverLetter,
      cvPath: profile.cvPath!,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
    });

    if (formResult.customAnswers) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { customAnswers: formResult.customAnswers },
      });
    }

    await log(applicationId, 'INFO', 'form_filled', 'Form fields filled', {
      fieldsFound: formResult.fieldsFound,
      fieldsFilledSuccessfully: formResult.fieldsFilled,
    });

    // ── Submit ────────────────────────────────────────────────────────────────
    if (formResult.submitted) {
      const afterScreenshot = await takeScreenshot(page, `app_${applicationId}_submitted`);
      await log(applicationId, 'INFO', 'submitted', 'Application submitted', {}, afterScreenshot ?? undefined);

      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'APPLIED', appliedAt: new Date() },
      });
    } else {
      await log(applicationId, 'WARN', 'not_submitted', 'Could not auto-submit — manual submission may be required');
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'FAILED', failureReason: 'Could not locate submit button' },
      });
    }
  } catch (err) {
    const screenshotPath = await takeScreenshot(page, `app_${applicationId}_error`).catch(() => undefined);
    await log(
      applicationId,
      'ERROR',
      'error',
      `Error during application: ${err instanceof Error ? err.message : String(err)}`,
      {},
      screenshotPath,
    );
    throw err;
  } finally {
    await page.close();
    await context.close();
  }
}
