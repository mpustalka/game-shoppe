import { createBrowserClient } from "@supabase/ssr"

// Browser-side Supabase client used for authentication (sign in, sign up,
// sign out, reading the current session). It uses the public anon /
// publishable key, which is safe to ship to the browser and is governed by
// row level security.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
