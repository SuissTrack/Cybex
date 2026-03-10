import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../lib/jwt';
import { authRateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();

// ── Register ─────────────────────────────────────────────────────────────────
router.post(
  '/register',
  authRateLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body as {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
      };

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError('Email already registered', 409);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          emailVerified: true, // skip email verification for MVP
          profile: {
            create: { firstName, lastName },
          },
        },
      });

      const accessToken = signAccessToken({ sub: user.id, email: user.email });
      const refreshToken = await issueRefreshToken(user.id);

      res.status(201).json({ accessToken, refreshToken, userId: user.id });
    } catch (err) {
      next(err);
    }
  },
);

// ── Login ────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  authRateLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        throw new AppError('Invalid credentials', 401);
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new AppError('Invalid credentials', 401);
      }

      const accessToken = signAccessToken({ sub: user.id, email: user.email });
      const refreshToken = await issueRefreshToken(user.id);

      res.json({ accessToken, refreshToken, userId: user.id });
    } catch (err) {
      next(err);
    }
  },
);

// ── Refresh ──────────────────────────────────────────────────────────────────
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      if (!refreshToken) throw new AppError('No refresh token', 400);

      const result = await rotateRefreshToken(refreshToken);
      if (!result) throw new AppError('Invalid or expired refresh token', 401);

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── Logout ───────────────────────────────────────────────────────────────────
router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) await revokeRefreshToken(refreshToken);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Request password reset ────────────────────────────────────────────────────
router.post(
  '/forgot-password',
  authRateLimit,
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email: string };
      const user = await prisma.user.findUnique({ where: { email } });

      // Always respond 200 to prevent email enumeration
      if (user) {
        const resetToken = uuidv4();
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry: expiry },
        });
        await sendPasswordResetEmail(email, resetToken);
      }

      res.json({ message: 'If this email exists, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  },
);

// ── Reset password ────────────────────────────────────────────────────────────
router.post(
  '/reset-password',
  authRateLimit,
  [
    body('token').notEmpty(),
    body('password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/)
      .matches(/[0-9]/),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body as { token: string; password: string };

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) throw new AppError('Invalid or expired reset token', 400);

      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetToken: null, resetTokenExpiry: null },
      });

      // Revoke all refresh tokens
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

      res.json({ message: 'Password reset successful' });
    } catch (err) {
      next(err);
    }
  },
);

// ── Me ───────────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, emailVerified: true, createdAt: true },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
