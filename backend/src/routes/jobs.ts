import { Router, Request, Response, NextFunction } from 'express';
import { query, body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { computeMatchScore } from '../services/matchingService';
import { rankJobsForProfile } from '../lib/claude';
import { logger } from '../lib/logger';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function buildCvText(profile: {
  firstName?: string | null; lastName?: string | null;
  summary?: string | null; skills?: unknown; cvParsedText?: string | null;
}): string {
  if (profile.cvParsedText) return profile.cvParsedText;
  const skills = Array.isArray(profile.skills) ? (profile.skills as string[]).join(', ') : '';
  return [
    `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
    profile.summary ?? '',
    skills ? `Compétences: ${skills}` : '',
  ].filter(Boolean).join('\n');
}

function buildProfileSummary(profile: {
  firstName?: string | null; lastName?: string | null;
  skills?: unknown; experience?: unknown; languages?: unknown;
}): string {
  const lines: string[] = [`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()];
  if (Array.isArray(profile.skills) && profile.skills.length) {
    lines.push(`Skills: ${(profile.skills as string[]).slice(0, 12).join(', ')}`);
  }
  if (Array.isArray(profile.experience) && profile.experience.length) {
    const exp = (profile.experience as Array<{ title?: string; company?: string }>).slice(0, 3);
    lines.push(`Expérience: ${exp.map((e) => `${e.title ?? ''} @ ${e.company ?? ''}`).join(' | ')}`);
  }
  if (Array.isArray(profile.languages) && profile.languages.length) {
    const langs = (profile.languages as Array<{ name?: string; level?: string }>)
      .map((l) => `${l.name ?? ''} (${l.level ?? ''})`)
      .join(', ');
    lines.push(`Langues: ${langs}`);
  }
  return lines.filter(Boolean).join('\n');
}

const router = Router();
router.use(authenticate);

// ── GET /api/jobs ─────────────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('source').optional().isIn(['LINKEDIN', 'INDEED', 'JOBSCH', 'JOBUPCH', 'WELCOME_TO_THE_JUNGLE']),
    query('remote').optional().isBoolean().toBoolean(),
    query('q').optional().trim(),
    query('location').optional().trim(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = (req.query.page as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};

      if (req.query.source) where.source = req.query.source;
      if (req.query.remote !== undefined) where.isRemote = req.query.remote;
      if (req.query.location) {
        where.location = { contains: req.query.location, mode: 'insensitive' };
      }
      if (req.query.q) {
        where.OR = [
          { title: { contains: req.query.q, mode: 'insensitive' } },
          { company: { contains: req.query.q, mode: 'insensitive' } },
          { description: { contains: req.query.q, mode: 'insensitive' } },
        ];
      }

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          orderBy: { scrapedAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            source: true,
            title: true,
            company: true,
            location: true,
            isRemote: true,
            contractType: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            skills: true,
            postedAt: true,
            scrapedAt: true,
            applyUrl: true,
            aiSummary: true,
          },
        }),
        prisma.job.count({ where }),
      ]);

      // Fetch user profile to compute match scores
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user!.id },
        include: { preferences: true },
      });

      const jobsWithScores = profile
        ? jobs.map((job) => ({
            ...job,
            matchScore: computeMatchScore(job, profile),
          }))
        : jobs;

      res.json({
        jobs: jobsWithScores,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/jobs/smart-match ────────────────────────────────────────────────
// Analyse en batch la compatibilité profil × offres via Claude Haiku.
// Body: { jobIds?: string[] }  — si absent, on prend les 30 offres les plus récentes.
router.post(
  '/smart-match',
  [body('jobIds').optional().isArray()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // 1. Profile
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (!profile) {
        res.status(400).json({ error: 'Profil introuvable — créez votre profil avant d\'utiliser Smart Match.' });
        return;
      }
      const cvText = buildCvText(profile as Parameters<typeof buildCvText>[0]);
      if (!cvText.trim()) {
        res.status(400).json({ error: 'CV manquant — uploadez votre CV pour utiliser Smart Match.' });
        return;
      }

      // 2. Jobs to rank
      const jobIds = req.body.jobIds as string[] | undefined;
      const jobs = await prisma.job.findMany({
        where: jobIds?.length ? { id: { in: jobIds } } : {},
        orderBy: { scrapedAt: 'desc' },
        take: 30,
        select: { id: true, title: true, company: true, skills: true },
      });

      if (!jobs.length) {
        res.status(400).json({ error: 'Aucune offre à analyser.' });
        return;
      }

      // 3. Build profile summary
      const profileSummary = buildProfileSummary(profile as Parameters<typeof buildProfileSummary>[0]);

      // 4. Detect language from first language
      const langs = Array.isArray(profile.languages)
        ? (profile.languages as Array<{ name?: string }>)
        : [];
      const language = langs[0]?.name?.toLowerCase().includes('french') ||
        langs[0]?.name?.toLowerCase().includes('français') ||
        langs[0]?.name?.toLowerCase().includes('francais')
          ? 'fr' as const
          : langs[0]?.name?.toLowerCase().includes('english') ? 'en' as const : 'fr' as const;

      logger.info(`Smart match started: ${jobs.length} jobs for user ${userId}`);

      // 5. Call Claude — map skills (Json) to string[]
      const jobsForClaude = jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        skills: Array.isArray(j.skills) ? (j.skills as string[]) : [],
      }));

      const matches = await rankJobsForProfile({ cvText, profileSummary, jobs: jobsForClaude, language });

      logger.info(`Smart match complete: ${matches.length} matches for user ${userId}`);
      res.json({ matches });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

export default router;
