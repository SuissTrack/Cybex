/**
 * Scraper for Indeed Switzerland / France
 * NOTE: Indeed's ToS restricts scraping. In production, use Indeed Publisher API.
 * This is a best-effort scraper for MVP/demo purposes with strict rate limiting.
 */
import { getBrowser, newStealthContext } from '../lib/browser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { summarizeJob } from '../lib/claude';

const DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractSkills(text: string): string[] {
  const known = [
    'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'C#', '.NET',
    'React', 'Vue', 'Angular', 'Node.js', 'PostgreSQL', 'MongoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  ];
  const lower = text.toLowerCase();
  return known.filter((s) => lower.includes(s.toLowerCase()));
}

export async function scrapeIndeed(): Promise<void> {
  const browser = await getBrowser();
  const context = await newStealthContext(browser);
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

  const searchUrls = [
    'https://ch.indeed.com/jobs?q=software+engineer&l=Suisse',
    'https://fr.indeed.com/jobs?q=développeur+fullstack&l=France',
  ];

  try {
    for (const searchUrl of searchUrls) {
      const page = await context.newPage();

      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout });
        await page.waitForSelector('.job_seen_beacon, [class*="JobCard"]', { timeout: 10000 }).catch(() => {});

        const jobCards = await page.evaluate(() => {
          const cards = document.querySelectorAll('.job_seen_beacon');
          return Array.from(cards)
            .slice(0, 10)
            .map((card) => {
              const link = card.querySelector('a[href*="/viewjob"]') as HTMLAnchorElement | null;
              const title = card.querySelector('[class*="jobTitle"]')?.textContent?.trim() ?? '';
              const company = card.querySelector('[class*="companyName"]')?.textContent?.trim() ?? '';
              const location = card.querySelector('[class*="companyLocation"]')?.textContent?.trim() ?? '';
              return { href: link?.href, title, company, location };
            })
            .filter((j) => j.href && j.title);
        });

        logger.info(`Indeed: found ${jobCards.length} cards`);

        for (const card of jobCards) {
          try {
            if (!card.href) continue;
            await sleep(DELAY_MS);

            const existing = await prisma.job.findUnique({ where: { sourceUrl: card.href } });
            if (existing) continue;

            const detailPage = await context.newPage();
            try {
              await detailPage.goto(card.href, { waitUntil: 'domcontentloaded', timeout });

              const description = await detailPage.evaluate(() => {
                return (
                  document.querySelector('#jobDescriptionText')?.textContent?.trim() ??
                  document.querySelector('[class*="jobsearch-jobDescriptionText"]')?.textContent?.trim() ??
                  ''
                );
              });

              if (!description || description.length < 100) continue;

              const isSwiss = card.href.includes('ch.indeed.com');
              const aiSummary = await summarizeJob(description).catch(() => undefined);

              await prisma.job.create({
                data: {
                  source: 'INDEED',
                  sourceUrl: card.href,
                  title: card.title,
                  company: card.company,
                  location: card.location || undefined,
                  isRemote:
                    description.toLowerCase().includes('remote') ||
                    description.toLowerCase().includes('télétravail'),
                  contractType: 'CDI',
                  currency: isSwiss ? 'CHF' : 'EUR',
                  description,
                  applyUrl: card.href,
                  aiSummary,
                  skills: extractSkills(description),
                },
              });

              logger.info(`Indeed: saved "${card.title}" at ${card.company}`);
            } finally {
              await detailPage.close();
            }
          } catch (err) {
            logger.warn(`Indeed: failed to scrape ${card.href}`, { err });
          }
        }
      } finally {
        await page.close();
      }

      await sleep(DELAY_MS * 2);
    }
  } finally {
    await context.close();
  }
}
