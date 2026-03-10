import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { parseCvText } from '../services/cvParser';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR ?? './uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cv_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(new Error('Only PDF, DOC, DOCX files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

// ── GET /api/profile ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
      include: { preferences: true },
    });
    if (!profile) throw new AppError('Profile not found', 404);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/profile ──────────────────────────────────────────────────────────
router.put(
  '/',
  [
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('phone').optional().trim(),
    body('location').optional().trim(),
    body('linkedinUrl').optional().isURL(),
    body('portfolioUrl').optional().isURL(),
    body('summary').optional().trim().isLength({ max: 2000 }),
    body('skills').optional().isArray(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, phone, location, linkedinUrl, portfolioUrl, summary, skills, languages, experience, education } =
        req.body as Record<string, unknown>;

      const profile = await prisma.profile.upsert({
        where: { userId: req.user!.id },
        update: {
          firstName: firstName as string | undefined,
          lastName: lastName as string | undefined,
          phone: phone as string | undefined,
          location: location as string | undefined,
          linkedinUrl: linkedinUrl as string | undefined,
          portfolioUrl: portfolioUrl as string | undefined,
          summary: summary as string | undefined,
          skills: (skills as string[]) ?? undefined,
          languages: languages ?? undefined,
          experience: experience ?? undefined,
          education: education ?? undefined,
        },
        create: {
          userId: req.user!.id,
          firstName: firstName as string | undefined,
          lastName: lastName as string | undefined,
          phone: phone as string | undefined,
          location: location as string | undefined,
          linkedinUrl: linkedinUrl as string | undefined,
          portfolioUrl: portfolioUrl as string | undefined,
          summary: summary as string | undefined,
          skills: (skills as string[]) ?? [],
          languages: languages ?? undefined,
          experience: experience ?? undefined,
          education: education ?? undefined,
        },
        include: { preferences: true },
      });

      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /api/profile/preferences ──────────────────────────────────────────────
router.put(
  '/preferences',
  [
    body('desiredTitles').isArray(),
    body('desiredLocations').isArray(),
    body('remotePreference').isIn(['ONSITE', 'HYBRID', 'REMOTE', 'ANY']),
    body('contractTypes').isArray(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
      if (!profile) throw new AppError('Profile not found', 404);

      const { desiredTitles, desiredLocations, remotePreference, contractTypes, minSalary, maxSalary, currency, targetCountries } =
        req.body as Record<string, unknown>;

      const prefs = await prisma.jobPreference.upsert({
        where: { profileId: profile.id },
        update: {
          desiredTitles: desiredTitles as string[],
          desiredLocations: desiredLocations as string[],
          remotePreference: remotePreference as 'ONSITE' | 'HYBRID' | 'REMOTE' | 'ANY',
          contractTypes: contractTypes as string[],
          minSalary: minSalary as number | undefined,
          maxSalary: maxSalary as number | undefined,
          currency: (currency as string) ?? 'CHF',
          targetCountries: (targetCountries as string[]) ?? ['CH', 'FR'],
        },
        create: {
          profileId: profile.id,
          desiredTitles: desiredTitles as string[],
          desiredLocations: desiredLocations as string[],
          remotePreference: remotePreference as 'ONSITE' | 'HYBRID' | 'REMOTE' | 'ANY',
          contractTypes: contractTypes as string[],
          minSalary: minSalary as number | undefined,
          maxSalary: maxSalary as number | undefined,
          currency: (currency as string) ?? 'CHF',
          targetCountries: (targetCountries as string[]) ?? ['CH', 'FR'],
        },
      });

      res.json(prefs);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/profile/cv ──────────────────────────────────────────────────────
router.post(
  '/cv',
  upload.single('cv'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const { path: cvPath, originalname } = req.file;
      const cvParsedText = await parseCvText(cvPath);

      const profile = await prisma.profile.upsert({
        where: { userId: req.user!.id },
        update: { cvPath, cvOriginalName: originalname, cvParsedText, cvParsedAt: new Date() },
        create: { userId: req.user!.id, cvPath, cvOriginalName: originalname, cvParsedText, cvParsedAt: new Date() },
      });

      res.json({ success: true, cvPath: profile.cvPath, cvParsedAt: profile.cvParsedAt });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
