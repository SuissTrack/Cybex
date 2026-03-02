// ─── Job offer ─────────────────────────────────────────────────────────────

export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE' | 'AUTRE'
export type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE'

export interface Job {
  id: string
  source: 'jobroom' | 'demo'
  title: string
  company: string | null
  location: string | null
  canton: string | null
  description: string | null
  requirements: string | null
  salaryMin: number | null
  salaryMax: number | null
  contractType: ContractType | null
  workloadMin: number | null
  workloadMax: number | null
  remote: boolean
  languagesRequired: string[]
  url: string | null
  stellennummer: string | null
  reportingObligation: boolean
  publishedAt: string | null   // ISO date string
  matchScore: number | null    // 0–100, calculé côté IA (Phase 4)
}

// ─── Filters ───────────────────────────────────────────────────────────────

export interface SearchFilters {
  keyword: string
  cantons: string[]
  onlineSinceDays: number
  contractTypes: ContractType[]
  workloadMin: number
  workloadMax: number
  remote: boolean | null      // null = tous
  page: number
  size: number
}

export const DEFAULT_FILTERS: SearchFilters = {
  keyword: '',
  cantons: [],
  onlineSinceDays: 30,
  contractTypes: [],
  workloadMin: 0,
  workloadMax: 100,
  remote: null,
  page: 0,
  size: 25,
}

// ─── API responses ──────────────────────────────────────────────────────────

export interface JobRoomSearchResponse {
  totalCount: number
  result: JobRoomRawJob[]
  _cached?: boolean
}

export interface JobRoomRawJob {
  jobAdvertisementId: { value: string }
  jobContent: {
    jobDescriptions: Array<{ languageIsoCode: string; title: string; description: string }>
    employment: {
      workloadPercentageMin: number
      workloadPercentageMax: number
      permanent?: boolean
      workForms?: string[]
    }
    location?: {
      city?: string
      cantonCode?: string
      postalCode?: string
    }
    company?: {
      name?: string
    }
    languageSkills?: Array<{ languageIsoCode: string; written?: string; spoken?: string }>
    salaryInfo?: {
      salaryMin?: number
      salaryMax?: number
    }
  }
  stellennummerEgov?: string
  stellennummerAvam?: string
  reportingObligation: boolean
  reportingObligationEndDate?: string
  publication: {
    startDate?: string
    endDate?: string
    euresDisplay: boolean
  }
  applyChannel?: {
    rawPostbox?: string
    formUrl?: string
    emailAddress?: string
    phoneNumber?: string
    additionalInfo?: string
  }
  publicContact?: {
    salutation?: string
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
  }
}

// ─── Connection status ──────────────────────────────────────────────────────

export type ConnectionStatus = 'live' | 'demo' | 'loading' | 'error'
