import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { enqueueApplication } from '../services/queueService';
import { generateCoverLetter, analyzeJobMatch } from '../lib/claude';
import { logger } from '../lib/logger';

const router = Router();
router.use(authenticate);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCvText(profile: {
  firstName?: string | null;
  lastName?: string | null;
  summary?: string | null;
  skills?: string[];
  cvParsedText?: string | null;
}): string {
  if (profile.cvParsedText) return profile.cvParsedText;
  const skills = Array.isArray(profile.skills) ? (profile.skills as string[]).join(', ') : '';
  return [
    `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
    profile.summary ?? '',
    skills ? `Compétences: ${skills}` : '',
  ].filter(Boolean).join('\n');
}

// ── GET /api/applications ─────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = (req.query.page as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = { userId: req.user!.id };
      if (req.query.status) where.status = req.query.status;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            job: {
              select: { id: true, title: true, company: true, location: true, source: true, applyUrl: true },
            },
          },
        }),
        prisma.application.count({ where }),
      ]);

      const stats = await prisma.application.groupBy({
        by: ['status'],
        where: { userId: req.user!.id },
        _count: true,
      });

      res.json({
        applications,
        stats: Object.fromEntries(stats.map((s) => [s.status, s._count])),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/applications/:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const app = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { job: true, automationLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!app) throw new AppError('Application not found', 404);
    res.json(app);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/applications ─────────────────────────────────────────────────────
// Creates a DRAFT: generates cover letter + ATS analysis — user reviews before submitting
router.post(
  '/',
  [body('jobId').notEmpty().isString()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.body as { jobId: string };

      const [job, profile] = await Promise.all([
        prisma.job.findUnique({ where: { id: jobId } }),
        prisma.profile.findUnique({ where: { userId: req.user!.id }, include: { preferences: true } }),
      ]);

      if (!job) throw new AppError('Offre introuvable', 404);
      if (!profile) throw new AppError('Complétez votre profil d\'abord', 400);
      if (!profile.cvPath) throw new AppError('Uploadez votre CV d\'abord', 400);

      const cvText = buildCvText(profile);
      const candidateName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
      const lang = (profile.languages as { name: string }[] | null)?.[0]?.name?.toLowerCase().includes('angl') ? 'en' : 'fr';

      // ── Run AI tasks in parallel ─────────────────────────────────────────────
      logger.info(`Preparing application: ${job.title} @ ${job.company}…`);
      const [coverLetter, atsAnalysis] = await Promise.allSettled([
        generateCoverLetter({ jobTitle: job.title, company: job.company, jobDescription: job.description ?? '', candidateName, cvText, language: lang }),
        analyzeJobMatch({ jobTitle: job.title, company: job.company, jobDescription: job.description ?? '', cvText, language: lang }),
      ]);

      const letter = coverLetter.status === 'fulfilled' ? coverLetter.value : null;
      const ats = atsAnalysis.status === 'fulfilled' ? atsAnalysis.value : null;
      if (coverLetter.status === 'rejected') logger.warn('Cover letter generation failed', { err: coverLetter.reason });
      if (atsAnalysis.status === 'rejected') logger.warn('ATS analysis failed', { err: atsAnalysis.reason });

      logger.info(`AI preparation complete. Score: ${ats?.score ?? 'N/A'}`);

      // ── Upsert as DRAFT ──────────────────────────────────────────────────────
      const application = await prisma.application.upsert({
        where: { userId_jobId: { userId: req.user!.id, jobId } },
        update: {
          status: 'DRAFT',
          ...(letter ? { coverLetter: letter } : {}),
          ...(ats ? { customAnswers: { ats } } : {}),
        },
        create: {
          userId: req.user!.id,
          jobId,
          status: 'DRAFT',
          ...(letter ? { coverLetter: letter } : {}),
          ...(ats ? { customAnswers: { ats } } : {}),
        },
        include: { job: { select: { id: true, title: true, company: true, applyUrl: true } } },
      });

      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/applications/bulk ───────────────────────────────────────────────
// Crée des candidatures DRAFT en masse à partir d'une liste de jobIds.
// Pré-remplit le matchScore depuis les données Smart Match — pas de lettre générée.
// Les lettres sont générées à la demande via POST /:id/generate-letter.
router.post(
  '/bulk',
  [
    body('jobIds').isArray({ min: 1 }).withMessage('jobIds requis'),
    body('smartMatchData').optional().isObject(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const jobIds = req.body.jobIds as string[];
      const smartMatchData = req.body.smartMatchData as Record<string, { score: number; reason: string }> | undefined;

      // Skip jobs that already have an application for this user
      const existing = await prisma.application.findMany({
        where: { userId, jobId: { in: jobIds } },
        select: { jobId: true },
      });
      const existingIds = new Set(existing.map((e) => e.jobId));
      const newJobIds = jobIds.filter((id) => !existingIds.has(id));

      if (!newJobIds.length) {
        res.json({ created: 0, skipped: existingIds.size, applications: [] });
        return;
      }

      // Bulk create DRAFT records in a single transaction
      const applications = await prisma.$transaction(
        newJobIds.map((jobId) => {
          const sm = smartMatchData?.[jobId];
          return prisma.application.create({
            data: {
              userId,
              jobId,
              status: 'DRAFT',
              ...(sm ? { matchScore: sm.score / 100 } : {}),
              ...(sm ? { customAnswers: { smartMatch: sm } as object } : {}),
            },
            include: {
              job: { select: { id: true, title: true, company: true, applyUrl: true } },
            },
          });
        }),
      );

      logger.info(`Bulk apply: ${applications.length} DRAFTs created for user ${userId}`);
      res.status(201).json({ created: applications.length, skipped: existingIds.size, applications });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/applications/:id/generate-letter ────────────────────────────────
// Génère la lettre de motivation IA pour une candidature DRAFT existante (sans lettre).
router.post('/:id/generate-letter', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [existing, profile] = await Promise.all([
      prisma.application.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
        include: { job: true },
      }),
      prisma.profile.findUnique({ where: { userId: req.user!.id } }),
    ]);

    if (!existing) throw new AppError('Candidature introuvable', 404);
    if (!profile) throw new AppError('Profil introuvable', 400);

    const cvText = buildCvText(profile);
    const candidateName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
    const lang = (profile.languages as { name: string }[] | null)?.[0]?.name?.toLowerCase().includes('angl') ? 'en' : 'fr';

    logger.info(`Generating letter for application ${existing.id}`);
    const letter = await generateCoverLetter({
      jobTitle: existing.job.title,
      company: existing.job.company,
      jobDescription: existing.job.description ?? '',
      candidateName,
      cvText,
      language: lang,
    });

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: { coverLetter: letter },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/applications/:id/submit ─────────────────────────────────────────
// User confirms they manually submitted — marks DRAFT → APPLIED
router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) throw new AppError('Candidature introuvable', 404);

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'APPLIED', appliedAt: new Date() },
      include: { job: { select: { id: true, title: true, company: true } } },
    });

    logger.info(`Application submitted: ${application.job.title} @ ${application.job.company}`);
    res.json(application);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/applications/:id/cover-letter ───────────────────────────────────
// Update the cover letter text (user edits before submitting)
router.patch(
  '/:id/cover-letter',
  [body('coverLetter').notEmpty().isString()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.application.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!existing) throw new AppError('Candidature introuvable', 404);

      const application = await prisma.application.update({
        where: { id: req.params.id },
        data: { coverLetter: req.body.coverLetter as string },
      });
      res.json(application);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/applications/:id ───────────────────────────────────────────────
router.patch(
  '/:id',
  [
    body('status').optional().isIn(['DRAFT', 'QUEUED', 'APPLIED', 'INTERVIEW_SCHEDULED', 'OFFER_RECEIVED', 'REJECTED', 'WITHDRAWN']),
    body('notes').optional().isString(),
    body('interviewDate').optional().isISO8601(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.application.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });
      if (!existing) throw new AppError('Candidature introuvable', 404);

      const application = await prisma.application.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.status ? { status: req.body.status } : {}),
          ...(req.body.notes !== undefined ? { notes: req.body.notes as string } : {}),
          ...(req.body.interviewDate ? { interviewDate: new Date(req.body.interviewDate as string) } : {}),
        },
        include: { job: { select: { id: true, title: true, company: true } } },
      });

      res.json(application);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/applications/:id ──────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) throw new AppError('Candidature introuvable', 404);

    await prisma.application.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Legacy: queue for automation (optional) ───────────────────────────────────
router.post('/:id/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) throw new AppError('Candidature introuvable', 404);

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'QUEUED' },
    });

    try {
      await enqueueApplication({ applicationId: existing.id, userId: req.user!.id, jobId: existing.jobId });
    } catch (queueErr) {
      logger.warn('Queue enqueue failed', { err: queueErr });
    }

    res.json(application);
  } catch (err) {
    next(err);
  }
});

export default router;
