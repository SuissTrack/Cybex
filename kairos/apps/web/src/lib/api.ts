import type { Job, SearchFilters, JobRoomSearchResponse, JobRoomRawJob, ConnectionStatus } from './types'
import { DEMO_JOBS } from './demo-data'

// URL du proxy — en dev, Vite redirige /proxy vers localhost:8787
// En production, pointer vers le Worker Cloudflare déployé
const PROXY_URL = import.meta.env.VITE_PROXY_URL ?? '/proxy'

// ─── Normalisation job-room → Job ──────────────────────────────────────────

function normalizeJobRoomJob(raw: JobRoomRawJob): Job {
  const id = raw.jobAdvertisementId.value

  // Priorité FR, sinon DE, sinon EN, sinon première desc disponible
  const desc =
    raw.jobContent.jobDescriptions.find((d) => d.languageIsoCode === 'fr') ??
    raw.jobContent.jobDescriptions.find((d) => d.languageIsoCode === 'de') ??
    raw.jobContent.jobDescriptions.find((d) => d.languageIsoCode === 'en') ??
    raw.jobContent.jobDescriptions[0]

  const employment = raw.jobContent.employment
  const location = raw.jobContent.location
  const company = raw.jobContent.company

  // Détecter remote depuis workForms
  const workForms = employment.workForms ?? []
  const isRemote = workForms.some(
    (f) => f.toLowerCase().includes('home') || f.toLowerCase().includes('remote') || f.toLowerCase().includes('telework')
  )

  // Type de contrat
  let contractType: Job['contractType'] = null
  if (employment.permanent === true) contractType = 'CDI'
  else if (employment.permanent === false) contractType = 'CDD'

  const languages =
    raw.jobContent.languageSkills?.map((l) => l.languageIsoCode.toUpperCase()) ?? []

  const applyUrl =
    raw.applyChannel?.formUrl ??
    (id ? `https://www.job-room.ch/stellensuche/detail/${id}` : null)

  return {
    id,
    source: 'jobroom',
    title: desc?.title ?? 'Poste sans titre',
    company: company?.name ?? null,
    location: location?.city ?? null,
    canton: location?.cantonCode ?? null,
    description: desc?.description ?? null,
    requirements: null, // job-room ne sépare pas requirements
    salaryMin: raw.jobContent.salaryInfo?.salaryMin ?? null,
    salaryMax: raw.jobContent.salaryInfo?.salaryMax ?? null,
    contractType,
    workloadMin: employment.workloadPercentageMin,
    workloadMax: employment.workloadPercentageMax,
    remote: isRemote,
    languagesRequired: languages,
    url: applyUrl,
    stellennummer: raw.stellennummerAvam ?? raw.stellennummerEgov ?? null,
    reportingObligation: raw.reportingObligation,
    publishedAt: raw.publication.startDate ?? null,
    matchScore: null, // calculé en Phase 4 (IA)
  }
}

// ─── Test connexion proxy ───────────────────────────────────────────────────

export async function checkProxyHealth(): Promise<ConnectionStatus> {
  try {
    const res = await fetch(`${PROXY_URL}/health`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return 'error'
    const data = await res.json() as { status: string; jobroom_reachable: boolean }
    return data.jobroom_reachable ? 'live' : 'error'
  } catch {
    return 'demo'
  }
}

// ─── Search jobs ────────────────────────────────────────────────────────────

export interface SearchResult {
  jobs: Job[]
  total: number
  source: 'live' | 'demo'
  error?: string
}

export async function searchJobs(filters: SearchFilters): Promise<SearchResult> {
  // Construction du body job-room.ch
  const body = {
    page: filters.page,
    size: filters.size,
    sort: 'RELEVANCE_DESC',
    body: {
      keyword: filters.keyword || '',
      professionCodes: [],
      cantonCodes: filters.cantons,
      communalCodes: [],
      regionCodes: [],
      workloadPercentageMin: filters.workloadMin > 0 ? filters.workloadMin : undefined,
      workloadPercentageMax: filters.workloadMax < 100 ? filters.workloadMax : undefined,
      permanent:
        filters.contractTypes.includes('CDI') && !filters.contractTypes.includes('CDD')
          ? true
          : filters.contractTypes.includes('CDD') && !filters.contractTypes.includes('CDI')
          ? false
          : null,
      companyName: '',
      onlineSinceDays: filters.onlineSinceDays,
      displayRestricted: false,
    },
  }

  try {
    const res = await fetch(`${PROXY_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`Proxy responded ${res.status}`)

    const data = (await res.json()) as JobRoomSearchResponse
    const jobs = (data.result ?? []).map(normalizeJobRoomJob)

    return { jobs, total: data.totalCount ?? jobs.length, source: 'live' }
  } catch (err) {
    // Fallback mode démo
    const filtered = filterDemoJobs(filters)
    return {
      jobs: filtered,
      total: filtered.length,
      source: 'demo',
      error: err instanceof Error ? err.message : 'Proxy unavailable',
    }
  }
}

// ─── Filtrage des données démo ──────────────────────────────────────────────

function filterDemoJobs(filters: SearchFilters): Job[] {
  let jobs = [...DEMO_JOBS]

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(kw) ||
        j.company?.toLowerCase().includes(kw) ||
        j.description?.toLowerCase().includes(kw)
    )
  }

  if (filters.cantons.length > 0) {
    jobs = jobs.filter((j) => j.canton && filters.cantons.includes(j.canton))
  }

  if (filters.contractTypes.length > 0) {
    jobs = jobs.filter((j) => j.contractType && filters.contractTypes.includes(j.contractType))
  }

  if (filters.remote === true) {
    jobs = jobs.filter((j) => j.remote)
  }

  return jobs
}

// ─── Fetch job detail ───────────────────────────────────────────────────────

export async function fetchJobDetail(id: string, isDemoMode: boolean): Promise<Job | null> {
  if (isDemoMode || id.startsWith('demo-')) {
    return DEMO_JOBS.find((j) => j.id === id) ?? null
  }

  try {
    const res = await fetch(`${PROXY_URL}/job/${id}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const raw = (await res.json()) as JobRoomRawJob
    return normalizeJobRoomJob(raw)
  } catch {
    return null
  }
}
