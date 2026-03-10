import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { handleMockRequest, MOCK_TOKEN } from './mockApi';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── Demo mode detection ───────────────────────────────────────────────────────
// Active si le token stocké est le token démo, ou si le backend est injoignable.
function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('accessToken');
  return token === MOCK_TOKEN;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// ── Mock dispatcher ───────────────────────────────────────────────────────────
function mockDispatch<T>(method: string, url: string, body?: unknown): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = handleMockRequest(method, url, body);
        resolve({ data: result.data as T, status: result.status, statusText: 'OK', headers: {}, config: {} as never });
      } catch (e) {
        reject(e);
      }
    }, 180); // simulate ~180ms latency
  });
}

// ── Real axios instance ───────────────────────────────────────────────────────
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 8000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Network error → switch to demo mode silently
    if (!error.response && error.code === 'ERR_NETWORK') {
      console.warn('[Kairos] Backend unreachable — switching to demo mode');
      if (typeof window !== 'undefined') {
        setTokens(MOCK_TOKEN, 'mock_refresh_token');
      }
      const url = (original.url ?? '').replace(/^\/api/, '');
      return mockDispatch(original.method ?? 'GET', url, original.data ? JSON.parse(original.data as string) : undefined);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return axiosInstance(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken },
        );
        setTokens(data.accessToken, data.refreshToken);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return axiosInstance(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Unified API client ─────────────────────────────────────────────────────
// In demo mode, bypasses the network entirely.
const request = <T>(method: string, url: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  if (isDemoMode()) {
    return mockDispatch<T>(method.toUpperCase(), url, body);
  }
  switch (method.toUpperCase()) {
    case 'GET':    return axiosInstance.get<T>(url, config);
    case 'POST':   return axiosInstance.post<T>(url, body, config);
    case 'PUT':    return axiosInstance.put<T>(url, body, config);
    case 'PATCH':  return axiosInstance.patch<T>(url, body, config);
    case 'DELETE': return axiosInstance.delete<T>(url, config);
    default:       return axiosInstance.get<T>(url, config);
  }
};

export const api = {
  get:    <T>(url: string, config?: AxiosRequestConfig) => request<T>('GET', url, undefined, config),
  post:   <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('POST', url, data, config),
  put:    <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('PUT', url, data, config),
  patch:  <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('PATCH', url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => request<T>('DELETE', url, undefined, config),
  setTokens,
  clearTokens,
};
