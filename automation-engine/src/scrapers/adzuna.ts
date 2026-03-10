/**
 * Scraper Adzuna — agrégateur mondial avec API REST officielle
 *
 * Adzuna agrège les offres de Indeed, jobs.ch, WTTJ, et 50+ sources.
 * API gratuite : 250 req/jour, 50 résultats/page.
 * Inscription : https://developer.adzuna.com/ (instantané)
 *
 * Variables requises :
 *   ADZUNA_APP_ID=xxxxxxxx
 *   ADZUNA_APP_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Volume : ~50 000 offres CH actives, mise à jour quotidienne
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { summarizeJob } from '../lib/claude';
import { ScrapedJob } from './index';

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const RESULTS_PER_PAGE = 50;
const MAX_PAGES = 3; // 150 jobs max par terme
const DELAY_MS = 800; // respecter la rate limit Adzuna

// Termes ciblés IT/Tech pour la Suisse
const SEARCH_TERMS = [
  'software engineer',
  'developer',
  'fullstack',
  'devops',
  'data engineer',
  'machine learning',
  'frontend',
  'backend',
];

// Cantons suisses IT (filtre géographique optionnel)
const SWISS_LOCATIONS = ['', 'Zurich', 'Geneva', 'Lausanne', 'Bern', 'Basel'];

const KNOWN_SKILLS = [
  'React', 'Vue', 'Angular', 'Next.js', 'Nuxt',
  'TypeScript', 'JavaScript', 'Python', 'Java', 'Kotlin', 'Scala',
  'Go', 'Rust', 'C#', '.NET', 'PHP', 'Ruby',
  'Node.js', 'Express', 'NestJS', 'Spring', 'Django', 'Rails',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform',
  'GraphQL', 'REST', 'gRPC', 'Kafka', 'RabbitMQ',
  'Git', 'CI/CD', 'GitHub Actions', 'Jenkins',
  'Machine Learning', 'TensorFlow', 'PyTorch', 'LLM',
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((s) => lower.includes(s.toLowerCase()));
}

// ─── Types réponse Adzuna ────────────────────────────────────────────────────

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: {
    display_name: string;
    area?: string[];
  };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_type?: string;       // "permanent" | "contract"
  contract_time?: string;       // "full_time" | "part_time"
  redirect_url: string;
  created: string;              // ISO 8601
  category?: { label: string };
}

interface AdzunaResponse {
  count: number;
  results: AdzunaJob[];
  mean?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapContractType(job: AdzunaJob): 'CDI' | 'CDD' | 'FREELANCE' | 'PART_TIME' {
  if (job.contract_type === 'contract') return 'CDD';
  if (job.contract_time === 'part_time') return 'PART_TIME';
  return 'CDI';
}

function detectRemote(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('remote') ||
    lower.includes('télétravail') ||
    lower.includes('home office') ||
    lower.includes('work from home')
  );
}

function cleanDescription(html: string): string {
  // Adzuna retourne parfois du HTML léger
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Upsert en DB ────────────────────────────────────────────────────────────

async function saveJob(raw: AdzunaJob): Promise<void> {
  // L'URL Adzuna redirige — on utilise redirect_url comme sourceUrl unique
  const sourceUrl = raw.redirect_url;
  const existing = await prisma.job.findUnique({ where: { sourceUrl } });

  const description = cleanDescription(raw.description);
  if (!description || description.length < 50) return;

  const skills = extractSkills(description);
  const isRemote = detectRemote(description + ' ' + raw.title);
  const contractType = mapContractType(raw);
  const postedAt = new Date(raw.created);

  // Normaliser le salaire : Adzuna peut retourner en CHF ou EUR
  // On détecte la devise par la localisation
  const isCH = (raw.location.area ?? []).some((a) =>
    a.toLowerCase().includes('switzerland') || a.toLowerCase().includes('suisse')
  );
  const currency = isCH ? 'CHF' : 'EUR';

  let aiSummary: string | undefined;
  if (!existing) {
    try {
      aiSummary = await summarizeJob(description);
    } catch {
      // Non-bloquant
    }
  }

  await prisma.job.upsert({
    where: { sourceUrl },
    update: {
      title: raw.title,
      company: raw.company.display_name,
      location: raw.location.display_name,
      isRemote,
      description,
      skills,
      salaryMin: raw.salary_min ? Math.round(raw.salary_min) : undefined,
      salaryMax: raw.salary_max ? Math.round(raw.salary_max) : undefined,
      scrapedAt: new Date(),
      ...(aiSummary ? { aiSummary } : {}),
    },
    create: {
      externalId: raw.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source: 'ADZUNA' as any, // enum étendu — nécessite `prisma generate` après migration
      sourceUrl,
      title: raw.title,
      company: raw.company.display_name,
      location: raw.location.display_name,
      isRemote,
      contractType,
      salaryMin: raw.salary_min ? Math.round(raw.salary_min) : undefined,
      salaryMax: raw.salary_max ? Math.round(raw.salary_max) : undefined,
      currency,
      description,
      applyUrl: sourceUrl,
      skills,
      postedAt,
      aiSummary,
    },
  });
}

// ─── Fetch une page ──────────────────────────────────────────────────────────

async function fetchPage(
  appId: string,
  appKey: string,
  what: string,
  where: string,
  page: number
): Promise<{ jobs: AdzunaJob[]; count: number }> {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(RESULTS_PER_PAGE),
    what,
    ...(where ? { where } : {}),
    sort_by: 'date',
    'content-type': 'application/json',
  });

  const url = `${ADZUNA_BASE}/ch/search/${page}?${params}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`Adzuna: credentials invalides (${res.status}). Vérifiez ADZUNA_APP_ID et ADZUNA_APP_KEY`);
  }
  if (!res.ok) {
    throw new Error(`Adzuna HTTP ${res.status} pour "${what}" à "${where}"`);
  }

  const data = (await res.json()) as AdzunaResponse;
  return { jobs: data.results ?? [], count: data.count ?? 0 };
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────

export async function scrapeAdzuna(): Promise<void> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    logger.warn(
      'Adzuna: ADZUNA_APP_ID ou ADZUNA_APP_KEY manquant — scraper ignoré. ' +
      'Inscrivez-vous sur https://developer.adzuna.com/'
    );
    return;
  }

  logger.info('Adzuna: démarrage du scraper');
  let totalSaved = 0;
  const seenIds = new Set<string>();

  for (const term of SEARCH_TERMS) {
    try {
      // Recherche nationale (pas de filtre ville) pour maximiser le volume
      const { jobs: firstPage, count } = await fetchPage(appId, appKey, term, '', 1);
      const pages = Math.min(MAX_PAGES, Math.ceil(count / RESULTS_PER_PAGE));
      logger.info(`Adzuna: "${term}" → ${count} résultats, ${pages} pages`);

      const allJobs: AdzunaJob[] = [...firstPage];
      for (let p = 2; p <= pages; p++) {
        await sleep(DELAY_MS);
        const { jobs } = await fetchPage(appId, appKey, term, '', p);
        allJobs.push(...jobs);
      }

      for (const job of allJobs) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);
        try {
          await saveJob(job);
          totalSaved++;
        } catch (err) {
          logger.warn(`Adzuna: erreur save job ${job.id}: ${err}`);
        }
      }

      await sleep(DELAY_MS);
    } catch (err) {
      logger.error(`Adzuna: échec terme "${term}": ${err}`);
    }
  }

  logger.info(`Adzuna: terminé — ${totalSaved} jobs traités`);
}
