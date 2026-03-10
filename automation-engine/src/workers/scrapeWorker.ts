import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { runAllScrapers } from '../scrapers';

export function startScrapeWorker(): Worker {
  const worker = new Worker(
    'scrape',
    async (job: Job) => {
      logger.info(`Scrape job ${job.id} started`);
      await runAllScrapers();
      logger.info(`Scrape job ${job.id} complete`);
    },
    { connection: redis, concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error(`Scrape job ${job?.id} failed`, { err });
  });

  return worker;
}
