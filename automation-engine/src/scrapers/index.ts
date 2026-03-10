import { logger } from '../lib/logger';
import { scrapeJobRoom } from './jobroom';   // ✅ API officielle SECO — prioritaire
import { scrapeAdzuna } from './adzuna';     // ✅ Agrégateur REST officiel — backup
import { scrapeWTTJ } from './wttj';         // RSS/HTML — complementaire
// Les scrapers Playwright ci-dessous sont conservés mais désactivés par défaut.
// Ils nécessitent Playwright et sont fragiles face aux mises à jour des sites.
// Réactiver si nécessaire en décommentant + en installant playwright.
// import { scrapeJobsCh } from './jobsch';
// import { scrapeJobupCh } from './jobupch';
// import { scrapeIndeed } from './indeed';
// import { scrapeLinkedIn } from './linkedin';

export interface ScrapedJob {
  externalId?: string;
  source: 'LINKEDIN' | 'INDEED' | 'JOBSCH' | 'JOBUPCH' | 'WELCOME_TO_THE_JUNGLE' | 'JOBROOM' | 'ADZUNA' | 'OTHER';
  sourceUrl: string;
  title: string;
  company: string;
  location?: string;
  isRemote?: boolean;
  contractType?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  description: string;
  applyUrl: string;
  postedAt?: Date;
}

/**
 * Stratégie de scraping :
 *
 * 1. job-room.ch (SECO) — API officielle, fiable, ~100k offres CH
 *    → Pas d'auth requise pour la lecture, 100% légal
 *
 * 2. Adzuna — API REST officielle (clé gratuite), agrège 50+ sources
 *    → Requiert ADZUNA_APP_ID + ADZUNA_APP_KEY dans .env (auto-ignoré si absent)
 *
 * 3. WTTJ — Welcome to the Jungle, bon volume Europe/tech
 *    → HTML scraping avec Playwright (léger, peu de JS)
 *
 * Les deux sources API (1 + 2) couvrent ~95% du marché CH sans aucun scraping fragile.
 */
export async function runAllScrapers(): Promise<void> {
  logger.info('=== Kairos Scraper — démarrage ===');

  // Étape 1 : Sources API officielles (prioritaires, parallèle)
  logger.info('Étape 1/2 : sources API officielles (job-room.ch + Adzuna)');
  const [jobRoomResult, adzunaResult] = await Promise.allSettled([
    scrapeJobRoom(),
    scrapeAdzuna(),
  ]);

  if (jobRoomResult.status === 'rejected') {
    logger.error(`job-room.ch échoué: ${jobRoomResult.reason}`);
  } else {
    logger.info('job-room.ch: OK');
  }

  if (adzunaResult.status === 'rejected') {
    logger.error(`Adzuna échoué: ${adzunaResult.reason}`);
  } else {
    logger.info('Adzuna: OK');
  }

  // Étape 2 : Sources complémentaires (WTTJ)
  logger.info('Étape 2/2 : sources complémentaires (WTTJ)');
  try {
    await scrapeWTTJ();
    logger.info('WTTJ: OK');
  } catch (err) {
    logger.error(`WTTJ échoué: ${err}`);
  }

  logger.info('=== Scraping terminé ===');
}

/**
 * Scraping allégé : uniquement les sources API (sans Playwright).
 * Utile pour des runs fréquents ou en environnement sans browser.
 */
export async function runApiScrapersOnly(): Promise<void> {
  logger.info('=== Kairos Scraper (API only) ===');

  const [jobRoomResult, adzunaResult] = await Promise.allSettled([
    scrapeJobRoom(),
    scrapeAdzuna(),
  ]);

  if (jobRoomResult.status === 'rejected') logger.error(`job-room.ch: ${jobRoomResult.reason}`);
  if (adzunaResult.status === 'rejected') logger.error(`Adzuna: ${adzunaResult.reason}`);

  logger.info('=== API scrapers terminés ===');
}
