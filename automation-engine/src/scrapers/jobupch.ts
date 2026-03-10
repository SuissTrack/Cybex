/**
 * Scraper for jobup.ch (Swiss job board)
 */
import { getBrowser, newStealthContext } from '../lib/browser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { summarizeJob } from '../lib/claude';

const BASE_URL = 'https://www.jobup.ch';
const SEARCH_TERMS = ['software engineer', 'développeur', 'fullstack', 'backend', 'frontend'];
const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractSkills(text: string): string[] {
  const known = [
    'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C#', '.NET',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'NestJS', 'Express',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
  ];
  const lower = text.toLowerCase();
  return known.filter((s) => lower.includes(s.toLowerCase()));
}

export async function scrapeJobupCh(): Promise<void> {
  const browser = await getBrowser();
  const context = await newStealthContext(browser);

  try {
    for (const term of SEARCH_TERMS) {
      const page = await context.newPage();
      const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

      try {
        const url = `${BASE_URL}/fr/emplois/?term=${encodeURIComponent(term)}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
        await page.waitForSelector('.job-list-item, [class*="JobListItem"]', { timeout: 10000 }).catch(() => {});

        const jobLinks = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href*="/fr/emplois/detail/"]');
          return Array.from(links)
            .slice(0, 10)
            .map((a) => (a as HTMLAnchorElement).href)
            .filter(Boolean);
        });

        logger.info(`jobup.ch: ${jobLinks.length} links for "${term}"`);

        for (const link of jobLinks.slice(0, 10)) {
          try {
            await sleep(DELAY_MS);
            const existing = await prisma.job.findUnique({ where: { sourceUrl: link } });
            if (existing) continue;

            const detailPage = await context.newPage();
            try {
              await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout });

              const data = await detailPage.evaluate(() => {
                const getText = (sel: string) =>
                  document.querySelector(sel)?.textContent?.trim() ?? '';
                return {
                  title: getText('h1'),
                  company: getText('[class*="company"] h2') || getText('[class*="CompanyName"]'),
                  location: getText('[class*="location"]') || getText('[class*="Location"]'),
                  description: document.querySelector('[class*="description"], [class*="Description"]')?.textContent?.trim() ?? '',
                };
              });

              if (!data.title || !data.company || data.description.length < 100) continue;

              const aiSummary = await summarizeJob(data.description).catch(() => undefined);

              await prisma.job.create({
                data: {
                  source: 'JOBUPCH',
                  sourceUrl: link,
                  title: data.title,
                  company: data.company,
                  location: data.location || undefined,
                  isRemote:
                    data.description.toLowerCase().includes('télétravail') ||
                    data.description.toLowerCase().includes('remote'),
                  contractType: 'CDI',
                  currency: 'CHF',
                  description: data.description,
                  applyUrl: link,
                  aiSummary,
                  skills: extractSkills(data.description),
                },
              });

              logger.info(`jobup.ch: saved "${data.title}" at ${data.company}`);
            } finally {
              await detailPage.close();
            }
          } catch (err) {
            logger.warn(`jobup.ch: failed to scrape ${link}`, { err });
          }
        }
      } finally {
        await page.close();
      }

      await sleep(DELAY_MS);
    }
  } finally {
    await context.close();
  }
}
