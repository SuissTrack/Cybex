import 'dotenv/config';
import cron from 'node-cron';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { startApplicationWorker } from './workers/applicationWorker';
import { startScrapeWorker } from './workers/scrapeWorker';
import { runAllScrapers } from './scrapers';

async function main() {
  logger.info('Automation engine starting…');

  // ── Workers ─────────────────────────────────────────────────────────────────
  startApplicationWorker();
  startScrapeWorker();

  // ── Scheduled scraping ───────────────────────────────────────────────────────
  const cronExpr = process.env.SCRAPER_CRON ?? '0 */6 * * *'; // every 6 hours
  cron.schedule(cronExpr, async () => {
    logger.info('Cron: starting scheduled scrape');
    try {
      await runAllScrapers();
    } catch (err) {
      logger.error('Cron scrape failed', { err });
    }
  });

  logger.info(`Automation engine ready. Scraper cron: ${cronExpr}`);
}

main().catch((err) => {
  logger.error('Fatal error in automation engine', { err });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down…');
  await redis.quit();
  process.exit(0);
});
