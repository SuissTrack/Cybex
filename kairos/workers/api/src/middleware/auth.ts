import type { MiddlewareHandler } from 'hono'
import { createClient } from '@supabase/supabase-js'

export interface AuthEnv {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
  }
}

export const authMiddleware: MiddlewareHandler<{ Bindings: AuthEnv }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  c.set('userId', user.id)
  await next()
}
