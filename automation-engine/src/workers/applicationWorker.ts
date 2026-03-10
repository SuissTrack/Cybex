import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { runApplication } from '../applicator';

interface ApplicationJobData {
  applicationId: string;
  userId: string;
  jobId: string;
}

export function startApplicationWorker(): Worker {
  const worker = new Worker<ApplicationJobData>(
    'applications',
    async (job: Job<ApplicationJobData>) => {
      const { applicationId, userId, jobId } = job.data;

      logger.info(`Running application ${applicationId}`);

      try {
        await runApplication({ applicationId, userId, jobId });
      } catch (err) {
        logger.error(`Application ${applicationId} failed`, { err });

        await prisma.application.update({
          where: { id: applicationId },
          data: {
            status: 'FAILED',
            failureReason: err instanceof Error ? err.message : String(err),
          },
        }).catch(() => {});

        await prisma.automationLog.create({
          data: {
            applicationId,
            level: 'ERROR',
            step: 'worker',
            message: `Application failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        }).catch(() => {});

        throw err; // re-throw for BullMQ retry logic
      }
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.AUTOMATION_CONCURRENCY ?? '2', 10),
    },
  );

  worker.on('completed', (job) => logger.info(`Application job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`Application job ${job?.id} failed`, { err }));

  return worker;
}
