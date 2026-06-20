import { createClient } from "@supabase/supabase-js"

// Privileged, service-role Supabase client. It bypasses Row Level Security and
// can use the Auth Admin API (list/create/update/delete users), so it MUST only
// ever be constructed inside server code (route handlers) — never shipped to
// the browser.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SERVICE_ROLE_KEY

export function hasAdminConfig() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)
}

export function createAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is not configured")
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
