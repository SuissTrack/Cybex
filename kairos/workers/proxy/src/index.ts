import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Env = {
  JOBROOM_API_BASE: string
  CACHE_TTL: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS — autorise toutes les origines (Cloudflare Pages + dev local)
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Accept'],
    maxAge: 86400,
  })
)

const JOBROOM_BASE = 'https://www.job-room.ch/api'
const CACHE_SECONDS = 300 // 5 minutes

// ─── Health check ──────────────────────────────────────────────────────────

app.get('/health', async (c) => {
  try {
    const res = await fetch(`${JOBROOM_BASE}/jobAdvertisements/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: 0,
        size: 1,
        sort: 'RELEVANCE_DESC',
        body: { keyword: '', onlineSinceDays: 1 },
      }),
    })
    return c.json({
      status: 'ok',
      jobroom_reachable: res.ok,
      jobroom_status: res.status,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return c.json({
      status: 'degraded',
      jobroom_reachable: false,
      error: String(e),
      timestamp: new Date().toISOString(),
    })
  }
})

// ─── Search ────────────────────────────────────────────────────────────────
// POST /search
// Body : même format que l'API job-room.ch

app.post('/search', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const cacheKey = `search:${JSON.stringify(body)}`
  const cache = caches.default

  // Essai depuis le cache Cloudflare
  const cacheUrl = new URL(`https://kairos-proxy.internal/cache?k=${encodeURIComponent(cacheKey)}`)
  const cached = await cache.match(cacheUrl)
  if (cached) {
    const data = await cached.json() as Record<string, unknown>
    return c.json({ ...data, _cached: true })
  }

  try {
    const upstream = await fetch(`${JOBROOM_BASE}/jobAdvertisements/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Kairos/1.0 (job aggregator)',
      },
      body: JSON.stringify(body),
    })

    if (!upstream.ok) {
      return c.json(
        {
          error: 'Upstream error',
          status: upstream.status,
          statusText: upstream.statusText,
        },
        upstream.status as 400 | 401 | 403 | 404 | 429 | 500
      )
    }

    const data = await upstream.json() as Record<string, unknown>

    // Mise en cache Cloudflare (TTL = 5 min)
    const cacheResponse = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
      },
    })
    c.executionCtx.waitUntil(cache.put(cacheUrl, cacheResponse))

    return c.json({ ...data, _cached: false })
  } catch (e) {
    return c.json({ error: 'Fetch failed', detail: String(e) }, 502)
  }
})

// ─── Job detail ────────────────────────────────────────────────────────────
// GET /job/:id

app.get('/job/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const upstream = await fetch(`${JOBROOM_BASE}/jobAdvertisements/${id}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Kairos/1.0',
      },
    })

    if (!upstream.ok) {
      return c.json({ error: 'Job not found', status: upstream.status }, 404)
    }

    const data = await upstream.json()
    return c.json(data)
  } catch (e) {
    return c.json({ error: 'Fetch failed', detail: String(e) }, 502)
  }
})

// ─── 404 fallback ──────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Not found' }, 404))

export default app
