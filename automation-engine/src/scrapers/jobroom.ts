/**
 * Scraper pour job-room.ch — portail officiel de la Confédération Suisse (SECO)
 *
 * Utilise l'API interne du site (identique à celle du proxy CF Worker).
 * Toutes les entreprises suisses ont l'OBLIGATION légale d'y publier les postes
 * avec taux de chômage > seuil (Stellenmeldepflicht).
 * Source fiable, gratuite et sans authentification pour la lecture.
 *
 * Volume : ~100 000+ offres actives
 * Rate limit : requêtes espacées de 500 ms, max 200 jobs/run
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { summarizeJob } from '../lib/claude';
import { ScrapedJob } from './index';

const JOBROOM_API = 'https://www.job-room.ch/api';
const PAGE_SIZE = 50;
const MAX_PAGES = 4; // 200 jobs max par run
const DELAY_MS = 500;

// Termes de recherche ciblés IT/Tech suisse
const SEARCH_TERMS = [
  'software engineer',
  'développeur',
  'fullstack',
  'frontend',
  'backend',
  'devops',
  'data engineer',
  'cloud',
];

// Stack technique connue pour extraction de skills
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
  return KNOWN_SKILLS.filter((skill) =>
    lower.includes(skill.toLowerCase())
  );
}

// ─── Types réponse job-room.ch ──────────────────────────────────────────────

interface JobRoomJob {
  id: string;
  externalId?: string;
  jobDescriptions?: Array<{
    languageIsoCode: string;
    title?: string;
    description?: string;
  }>;
  company?: {
    name?: string;
    city?: string;
    website?: string;
  };
  location?: {
    city?: string;
    postalCode?: string;
    cantonCode?: string;
  };
  employment?: {
    workloadPercentageMin?: number;
    workloadPercentageMax?: number;
    permanent?: boolean;
    shortEmployment?: boolean;
  };
  applyChannel?: {
    rawSources?: Array<{ value?: string }>;
    emailAddress?: string;
    formUrl?: string;
  };
  publicationStartDate?: string;
  publicationEndDate?: string;
  reportingObligation?: boolean;
}

interface JobRoomSearchResponse {
  totalCount?: number;
  result?: JobRoomJob[];
  // Format alternatif parfois retourné
  content?: JobRoomJob[];
  totalElements?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickDescription(job: JobRoomJob): string {
  if (!job.jobDescriptions?.length) return '';
  // Préférer FR, puis DE, puis EN, puis le premier disponible
  const pref = ['fr', 'de', 'en'];
  for (const lang of pref) {
    const desc = job.jobDescriptions.find((d) => d.languageIsoCode === lang);
    if (desc?.description) return desc.description;
  }
  return job.jobDescriptions[0]?.description ?? '';
}

function pickTitle(job: JobRoomJob): string {
  if (!job.jobDescriptions?.length) return 'Poste sans titre';
  const pref = ['fr', 'de', 'en'];
  for (const lang of pref) {
    const desc = job.jobDescriptions.find((d) => d.languageIsoCode === lang);
    if (desc?.title) return desc.title;
  }
  return job.jobDescriptions[0]?.title ?? 'Poste sans titre';
}

function pickApplyUrl(job: JobRoomJob): string {
  // 1. URL de formulaire externe
  if (job.applyChannel?.formUrl) return job.applyChannel.formUrl;
  // 2. Première source brute
  const raw = job.applyChannel?.rawSources?.[0]?.value;
  if (raw) return raw;
  // 3. Email (mailto)
  if (job.applyChannel?.emailAddress)
    return `mailto:${job.applyChannel.emailAddress}`;
  // 4. Fallback : lien direct job-room
  return `https://www.job-room.ch/offres-emploi/detail/${job.id}`;
}

function mapContractType(emp?: JobRoomJob['employment']): string {
  if (!emp) return 'CDI';
  if (emp.shortEmployment) return 'CDD';
  if (emp.permanent === false) return 'CDD';
  return 'CDI';
}

function detectRemote(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes('télétravail') ||
    lower.includes('home office') ||
    lower.includes('remote') ||
    lower.includes('homeoffice') ||
    lower.includes('à distance')
  );
}

// ─── Upsert en DB ────────────────────────────────────────────────────────────

async function saveJob(raw: JobRoomJob): Promise<void> {
  const sourceUrl = `https://www.job-room.ch/offres-emploi/detail/${raw.id}`;
  const existing = await prisma.job.findUnique({ where: { sourceUrl } });

  const title = pickTitle(raw);
  const description = pickDescription(raw);
  if (!description || description.length < 50) return; // Ignorer les fiches vides

  const applyUrl = pickApplyUrl(raw);
  const company = raw.company?.name ?? 'Entreprise confidentielle';
  const canton = raw.location?.cantonCode ?? '';
  const city = raw.location?.city ?? raw.company?.city ?? '';
  const location = [city, canton].filter(Boolean).join(', ') || 'Suisse';
  const contractType = mapContractType(raw.employment);
  const isRemote = detectRemote(description);
  const skills = extractSkills(description);
  const postedAt = raw.publicationStartDate
    ? new Date(raw.publicationStartDate)
    : undefined;

  // Résumé IA si nouveau job
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
      title,
      company,
      location,
      isRemote,
      description,
      skills,
      scrapedAt: new Date(),
      ...(postedAt ? { postedAt } : {}),
      ...(aiSummary ? { aiSummary } : {}),
    },
    create: {
      externalId: raw.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source: 'JOBROOM' as any, // enum étendu — nécessite `prisma generate` après migration
      sourceUrl,
      title,
      company,
      location,
      isRemote,
      contractType: contractType === 'CDD' ? 'CDD' : 'CDI',
      currency: 'CHF',
      description,
      applyUrl,
      skills,
      postedAt,
      aiSummary,
    },
  });
}

// ─── Fetch une page ──────────────────────────────────────────────────────────

async function fetchPage(
  keyword: string,
  page: number
): Promise<{ jobs: JobRoomJob[]; total: number }> {
  const body = {
    page,
    size: PAGE_SIZE,
    sort: 'DATE_DESC',
    body: {
      keyword,
      onlineSinceDays: 30,
    },
  };

  const res = await fetch(`${JOBROOM_API}/jobAdvertisements/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Kairos/1.0 (aggregateur emploi suisse)',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`job-room.ch HTTP ${res.status} pour keyword="${keyword}"`);
  }

  const data = (await res.json()) as JobRoomSearchResponse;
  const jobs = data.result ?? data.content ?? [];
  const total = data.totalCount ?? data.totalElements ?? 0;
  return { jobs, total };
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────

export async function scrapeJobRoom(): Promise<void> {
  logger.info('job-room.ch: démarrage du scraper');
  let totalSaved = 0;
  const seenIds = new Set<string>();

  for (const term of SEARCH_TERMS) {
    try {
      const { jobs: firstPage, total } = await fetchPage(term, 0);
      const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
      logger.info(`job-room.ch: "${term}" → ${total} résultats, ${pages} pages`);

      // Page 0 déjà chargée
      const allPages: JobRoomJob[][] = [firstPage];
      for (let p = 1; p < pages; p++) {
        await sleep(DELAY_MS);
        const { jobs } = await fetchPage(term, p);
        allPages.push(jobs);
      }

      for (const page of allPages) {
        for (const job of page) {
          if (seenIds.has(job.id)) continue; // dédoublonnage cross-terms
          seenIds.add(job.id);
          try {
            await saveJob(job);
            totalSaved++;
          } catch (err) {
            logger.warn(`job-room.ch: erreur save job ${job.id}: ${err}`);
          }
        }
      }

      await sleep(DELAY_MS);
    } catch (err) {
      logger.error(`job-room.ch: échec terme "${term}": ${err}`);
    }
  }

  logger.info(`job-room.ch: terminé — ${totalSaved} jobs traités`);
}
