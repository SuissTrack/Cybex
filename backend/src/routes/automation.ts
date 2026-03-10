import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { triggerScrape } from '../services/queueService';

const router = Router();
router.use(authenticate);

// ── POST /api/automation/scrape ───────────────────────────────────────────────
// Manually trigger job scraping
router.post('/scrape', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await triggerScrape();
    res.json({ message: 'Scrape job queued', jobId: job.id });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/automation/logs ──────────────────────────────────────────────────
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { applicationId } = req.query as { applicationId?: string };

    if (applicationId) {
      // Verify the application belongs to the user
      const app = await prisma.application.findFirst({
        where: { id: applicationId, userId: req.user!.id },
      });
      if (!app) throw new AppError('Application not found', 404);
    }

    const logs = await prisma.automationLog.findMany({
      where: applicationId
        ? { applicationId }
        : {
            application: { userId: req.user!.id },
          },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
