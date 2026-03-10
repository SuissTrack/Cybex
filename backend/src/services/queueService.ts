import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

// ── Queue definitions ─────────────────────────────────────────────────────────
export const applicationQueue = new Queue('applications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const scrapeQueue = new Queue('scrape', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: { count: 20 },
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
export async function enqueueApplication(data: {
  applicationId: string;
  userId: string;
  jobId: string;
}): Promise<Job> {
  return applicationQueue.add('apply', data, {
    jobId: `apply_${data.applicationId}`,
  });
}

export async function triggerScrape(): Promise<Job> {
  return scrapeQueue.add('scrape-all', {}, {
    jobId: `scrape_${Date.now()}`,
  });
}

// ── Application worker (runs inside backend for MVP; move to automation-engine in prod) ──
export function startApplicationWorker(): Worker {
  const worker = new Worker(
    'applications',
    async (job: Job) => {
      const { applicationId } = job.data as {
        applicationId: string;
        userId: string;
        jobId: string;
      };

      logger.info(`Processing application ${applicationId}`);

      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'APPLYING' },
      });

      await prisma.automationLog.create({
        data: {
          applicationId,
          level: 'INFO',
          step: 'queued',
          message: 'Application picked up by automation engine',
        },
      });

      // The actual Playwright automation runs in the automation-engine container.
      // This worker just marks status; the engine polls the queue via Redis.
    },
    { connection: redis, concurrency: 5 },
  );

  worker.on('completed', (job) => logger.info(`Job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`Job ${job?.id} failed`, { err }));

  return worker;
}
