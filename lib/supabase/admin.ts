import "server-only"

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

const ADMIN_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY

export function hasAdminConfig() {
  return Boolean(SUPABASE_URL && ADMIN_KEY)
}

export function createAdminClient() {
  // console.log("ADMIN SUPABASE CONFIG", {
  //   url: SUPABASE_URL,

  //   selectedKeySource: process.env.SUPABASE_SECRET_KEY
  //     ? "SUPABASE_SECRET_KEY"
  //     : process.env.SUPABASE_SERVICE_ROLE_KEY
  //       ? "SUPABASE_SERVICE_ROLE_KEY"
  //       : process.env.SERVICE_ROLE_KEY
  //         ? "SERVICE_ROLE_KEY"
  //         : "NONE",

  //   keyPrefix: ADMIN_KEY?.slice(0, 10) ?? "NONE",
  // })

  if (!SUPABASE_URL || !ADMIN_KEY) {
    throw new Error("Supabase admin configuration is missing")
  }

  return createClient(SUPABASE_URL, ADMIN_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
