import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import { authMiddleware } from './middleware/auth'
import type { AuthEnv } from './middleware/auth'

type Bindings = AuthEnv

const app = new Hono<{ Bindings: Bindings }>()

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://kairos.ch'],
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Simple connectivity check
  const { error } = await supabase.from('profiles').select('id').limit(1)

  return c.json({
    status: error ? 'degraded' : 'ok',
    supabase: error ? error.message : 'connected',
    timestamp: new Date().toISOString(),
  })
})

// ─── Protected routes (require JWT) ──────────────────────────────────────────

app.use('/api/profile*', authMiddleware)

// GET /api/profile — retourne le profil de l'utilisateur
app.get('/api/profile', async (c) => {
  const userId = c.get('userId')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ error: 'Profile not found' }, 404)
    }
    return c.json({ error: error.message }, 500)
  }

  return c.json(data)
})

// PUT /api/profile — met à jour le profil
app.put('/api/profile', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  // Remove fields that should never be updated via this endpoint
  const { id: _id, created_at: _ca, credits: _cr, ...safeBody } = body

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...safeBody, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)

  return c.json(data)
})

// POST /api/profile/cv — upload CV multipart
app.post('/api/profile/cv', async (c) => {
  const userId = c.get('userId')

  const formData = await c.req.formData()
  const rawFile = formData.get('file')

  if (!rawFile || typeof rawFile === 'string') {
    return c.json({ error: 'No file provided (field: "file")' }, 400)
  }

  // CF Workers FormData returns Blob-like objects; cast to access File API
  const file = rawFile as unknown as {
    name: string
    size: number
    type: string
    arrayBuffer: () => Promise<ArrayBuffer>
  }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File exceeds 5 MB limit' }, 413)
  }

  const isDocx = file.name.endsWith('.docx')
  const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf'
  if (!isPdf && !isDocx) {
    return c.json({ error: 'Only PDF and DOCX files are accepted' }, 415)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const ext = isDocx ? 'docx' : 'pdf'
  const path = `cvs/${userId}/cv.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || 'application/pdf',
      upsert: true,
    })

  if (uploadError) return c.json({ error: uploadError.message }, 500)

  const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ cv_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) return c.json({ error: updateError.message }, 500)

  return c.json({ cv_url: urlData.publicUrl })
})

export default app
