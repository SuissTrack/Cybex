/**
 * Scraper for LinkedIn Jobs (public search results only)
 * NOTE: LinkedIn's ToS restricts automated access. In production, use LinkedIn Jobs API.
 * This scraper only accesses the public search page, mimics human browsing,
 * and is rate-limited. For commercial use, replace with the official API.
 */
import { getBrowser, newStealthContext } from '../lib/browser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { summarizeJob } from '../lib/claude';

const DELAY_MS = 4000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractSkills(text: string): string[] {
  const known = [
    'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust', 'C#', '.NET',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'NestJS', 'FastAPI', 'Django',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  ];
  const lower = text.toLowerCase();
  return known.filter((s) => lower.includes(s.toLowerCase()));
}

export async function scrapeLinkedIn(): Promise<void> {
  const browser = await getBrowser();
  const context = await newStealthContext(browser);
  const timeout = parseInt(process.env.SCRAPER_TIMEOUT_MS ?? '30000', 10);

  const searches = [
    'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=Switzerland&f_TPR=r86400',
    'https://www.linkedin.com/jobs/search/?keywords=d%C3%A9veloppeur%20fullstack&location=France&f_TPR=r86400',
  ];

  try {
    for (const searchUrl of searches) {
      const page = await context.newPage();

      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout });
        await page.waitForSelector('.job-search-card, .jobs-search__results-list', { timeout: 15000 }).catch(() => {});

        const jobLinks = await page.evaluate(() => {
          const links = document.querySelectorAll('.job-search-card a[href*="/jobs/view/"], a[href*="linkedin.com/jobs/view/"]');
          return Array.from(links)
            .slice(0, 10)
            .map((a) => (a as HTMLAnchorElement).href.split('?')[0])
            .filter(Boolean);
        });

        logger.info(`LinkedIn: found ${jobLinks.length} links`);

        for (const link of jobLinks) {
          try {
            await sleep(DELAY_MS);
            const existing = await prisma.job.findUnique({ where: { sourceUrl: link } });
            if (existing) continue;

            const detailPage = await context.newPage();
            try {
              await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout });
              await detailPage.waitForSelector('.description__text, .job-details', { timeout: 10000 }).catch(() => {});

              const data = await detailPage.evaluate(() => {
                const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() ?? '';
                return {
                  title: getText('h1.topcard__title') || getText('.job-details-jobs-unified-top-card__job-title'),
                  company:
                    getText('.topcard__org-name-link') ||
                    getText('.job-details-jobs-unified-top-card__company-name'),
                  location:
                    getText('.topcard__flavor--bullet') ||
                    getText('.job-details-jobs-unified-top-card__workplace-type'),
                  description:
                    document.querySelector('.description__text')?.textContent?.trim() ??
                    document.querySelector('.jobs-description__content')?.textContent?.trim() ?? '',
                };
              });

              if (!data.title || !data.company || data.description.length < 100) continue;

              const isSwiss = link.includes('Switzerland') || data.location?.toLowerCase().includes('suisse') || data.location?.toLowerCase().includes('switzerland');
              const aiSummary = await summarizeJob(data.description).catch(() => undefined);

              await prisma.job.create({
                data: {
                  source: 'LINKEDIN',
                  sourceUrl: link,
                  externalId: link.match(/\/view\/(\d+)/)?.[1],
                  title: data.title,
                  company: data.company,
                  location: data.location || undefined,
                  isRemote:
                    data.description.toLowerCase().includes('remote') ||
                    data.description.toLowerCase().includes('télétravail'),
                  contractType: 'CDI',
                  currency: isSwiss ? 'CHF' : 'EUR',
                  description: data.description,
                  applyUrl: link,
                  aiSummary,
                  skills: extractSkills(data.description),
                },
              });

              logger.info(`LinkedIn: saved "${data.title}" at ${data.company}`);
            } finally {
              await detailPage.close();
            }
          } catch (err) {
            logger.warn(`LinkedIn: failed to scrape ${link}`, { err });
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
