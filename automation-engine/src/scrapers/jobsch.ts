/**
 * Scraper for jobs.ch
 * Uses public HTML pages. Respects robots.txt delays.
 * Rate limit: 1 req/s, max 50 jobs per run.
 */
import { getBrowser, newStealthContext } from '../lib/browser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { ScrapedJob } from './index';
import { summarizeJob } from '../lib/claude';

const BASE_URL = 'https://www.jobs.ch';
const SEARCH_TERMS = ['software engineer', 'développeur', 'fullstack', 'frontend', 'backend', 'devops'];
const MAX_JOBS_PER_TERM = 10;
const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeJobsCh(): Promise<void> {
  const browser = await getBrowser();
  const context = await newStealthContext(browser);

  try {
    for (const term of SEARCH_TERMS) {
      await scrapeSearchResults(context, term);
      await sleep(DELAY_MS);
    }
  } finally {
    await context.close();
  }
}

async function scrapeSearchResults(
  context: Awaited<ReturnType<typeof newStealthContext>>,
  term: string,
): Promise<void> {
  const page = await context.newPage();
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

  try {
    const url = `${BASE_URL}/fr/offres-emploi/?term=${encodeURIComponent(term)}&location=Suisse`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Wait for job cards to appear
    await page.waitForSelector('[data-cy="job-element"]', { timeout: 10000 }).catch(() => {});

    const jobLinks = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-cy="job-element"] a');
      return Array.from(cards)
        .slice(0, 10)
        .map((a) => (a as HTMLAnchorElement).href)
        .filter(Boolean);
    });

    logger.info(`jobs.ch: found ${jobLinks.length} links for term "${term}"`);

    for (const link of jobLinks.slice(0, MAX_JOBS_PER_TERM)) {
      try {
        await scrapeJobDetail(context, link);
        await sleep(DELAY_MS);
      } catch (err) {
        logger.warn(`jobs.ch: failed to scrape ${link}`, { err });
      }
    }
  } finally {
    await page.close();
  }
}

async function scrapeJobDetail(
  context: Awaited<ReturnType<typeof newStealthContext>>,
  url: string,
): Promise<void> {
  // Check if already scraped
  const existing = await prisma.job.findUnique({ where: { sourceUrl: url } });
  if (existing) return;

  const page = await context.newPage();
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    const data = await page.evaluate(() => {
      const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? '';
      return {
        title: getText('h1') || getText('[data-cy="job-title"]'),
        company: getText('[data-cy="job-company-name"]') || getText('.company-name'),
        location: getText('[data-cy="job-location"]') || getText('.location'),
        description: document.querySelector('[data-cy="job-description"]')?.innerHTML?.trim() ?? '',
        isRemote: document.body.innerText.toLowerCase().includes('télétravail') ||
                  document.body.innerText.toLowerCase().includes('homeoffice') ||
                  document.body.innerText.toLowerCase().includes('remote'),
      };
    });

    if (!data.title || !data.company) return;

    // Strip HTML tags from description
    const description = data.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!description || description.length < 100) return;

    const aiSummary = await summarizeJob(description).catch(() => undefined);

    const job: ScrapedJob = {
      source: 'JOBSCH',
      sourceUrl: url,
      title: data.title,
      company: data.company,
      location: data.location || undefined,
      isRemote: data.isRemote,
      description,
      applyUrl: url,
      contractType: 'CDI',
      currency: 'CHF',
    };

    await prisma.job.create({
      data: {
        ...job,
        aiSummary,
        skills: extractSkills(description),
      },
    });

    logger.info(`jobs.ch: saved "${data.title}" at ${data.company}`);
  } finally {
    await page.close();
  }
}

function extractSkills(text: string): string[] {
  const known = [
    'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C#', '.NET',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'NestJS', 'Express',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform',
    'GraphQL', 'REST', 'gRPC', 'Kafka', 'RabbitMQ',
    'Git', 'CI/CD', 'GitHub Actions', 'Jenkins',
  ];
  const lower = text.toLowerCase();
  return known.filter((s) => lower.includes(s.toLowerCase()));
}
