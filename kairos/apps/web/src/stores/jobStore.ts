import { create } from 'zustand'
import type { Job, SearchFilters, ConnectionStatus } from '../lib/types'
import { DEFAULT_FILTERS } from '../lib/types'
import { searchJobs, checkProxyHealth } from '../lib/api'

interface JobState {
  // Data
  jobs: Job[]
  total: number
  selectedJob: Job | null

  // Filters
  filters: SearchFilters

  // Status
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  connectionStatus: ConnectionStatus
  isDemo: boolean

  // Actions
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void
  resetFilters: () => void
  search: () => Promise<void>
  selectJob: (job: Job | null) => void
  checkConnection: () => Promise<void>
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  total: 0,
  selectedJob: null,
  filters: { ...DEFAULT_FILTERS },
  status: 'idle',
  error: null,
  connectionStatus: 'loading',
  isDemo: false,

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value, page: key === 'page' ? (value as number) : 0 } }))
  },

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  search: async () => {
    set({ status: 'loading', error: null })
    const { filters } = get()
    const result = await searchJobs(filters)
    set({
      jobs: result.jobs,
      total: result.total,
      status: 'success',
      error: result.error ?? null,
      isDemo: result.source === 'demo',
      connectionStatus: result.source === 'live' ? 'live' : 'demo',
    })
  },

  selectJob: (job) => set({ selectedJob: job }),

  checkConnection: async () => {
    set({ connectionStatus: 'loading' })
    const status = await checkProxyHealth()
    set({ connectionStatus: status, isDemo: status !== 'live' })
  },
}))
