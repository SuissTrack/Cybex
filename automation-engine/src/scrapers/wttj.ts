/**
 * Scraper for Welcome to the Jungle (France & remote)
 * Uses their public job listings page.
 */
import { getBrowser, newStealthContext } from '../lib/browser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { summarizeJob } from '../lib/claude';

const BASE_URL = 'https://www.welcometothejungle.com';
const SEARCH_URL = `${BASE_URL}/fr/jobs?query=software+engineer&refinementList%5Boffices.country_code%5D%5B%5D=FR`;
const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractSkills(text: string): string[] {
  const known = [
    'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Ruby', 'PHP', 'Kotlin', 'Swift',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Rails', 'Django', 'FastAPI', 'Spring',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'Pulumi',
    'GraphQL', 'REST', 'Kafka', 'CI/CD',
  ];
  const lower = text.toLowerCase();
  return known.filter((s) => lower.includes(s.toLowerCase()));
}

export async function scrapeWTTJ(): Promise<void> {
  const browser = await getBrowser();
  const context = await newStealthContext(browser);
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

  try {
    const page = await context.newPage();

    try {
      await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForSelector('[data-testid="job-card-slug"]', { timeout: 15000 }).catch(() => {});

      const jobLinks = await page.evaluate(() => {
        const cards = document.querySelectorAll('a[data-testid="job-card-slug"], a[href*="/companies/"][href*="/jobs/"]');
        return Array.from(cards)
          .slice(0, 15)
          .map((a) => {
            const href = (a as HTMLAnchorElement).href;
            return href.startsWith('http') ? href : `https://www.welcometothejungle.com${href}`;
          })
          .filter(Boolean);
      });

      logger.info(`WTTJ: found ${jobLinks.length} job links`);

      for (const link of jobLinks) {
        try {
          await sleep(DELAY_MS);
          const existing = await prisma.job.findUnique({ where: { sourceUrl: link } });
          if (existing) continue;

          const detailPage = await context.newPage();
          try {
            await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout });

            const data = await detailPage.evaluate(() => {
              const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? '';
              return {
                title: getText('h1') || getText('[class*="JobHeader"] h1'),
                company: getText('[class*="company-name"]') || getText('[data-testid="company-title"]'),
                location: getText('[data-testid="job-location"]') || getText('[class*="location"]'),
                description:
                  document.querySelector('[data-testid="job-description"]')?.textContent?.trim() ??
                  document.querySelector('[class*="job-description"]')?.textContent?.trim() ?? '',
                isRemote:
                  document.body.innerText.toLowerCase().includes('full remote') ||
                  document.body.innerText.toLowerCase().includes('télétravail complet'),
              };
            });

            if (!data.title || !data.company || data.description.length < 100) continue;

            const aiSummary = await summarizeJob(data.description).catch(() => undefined);

            await prisma.job.create({
              data: {
                source: 'WELCOME_TO_THE_JUNGLE',
                sourceUrl: link,
                title: data.title,
                company: data.company,
                location: data.location || undefined,
                isRemote: data.isRemote,
                contractType: 'CDI',
                currency: 'EUR',
                description: data.description,
                applyUrl: link,
                aiSummary,
                skills: extractSkills(data.description),
              },
            });

            logger.info(`WTTJ: saved "${data.title}" at ${data.company}`);
          } finally {
            await detailPage.close();
          }
        } catch (err) {
          logger.warn(`WTTJ: failed to scrape ${link}`, { err });
        }
      }
    } finally {
      await page.close();
    }
  } finally {
    await context.close();
  }
}
