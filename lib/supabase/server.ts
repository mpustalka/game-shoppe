import { cookies, headers } from "next/headers"

import { createServerClient, type CookieOptions } from "@supabase/ssr"

import { authCookieOptions } from "./cookie-options"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export async function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase client environment variables are missing")
  }

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: authCookieOptions(
      headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
    ),
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions)
          })
        } catch {
          /**
           * This can occur inside a Server Component
           * where cookies cannot be mutated.
           *
           * Middleware/proxy is responsible for
           * refreshing the session cookie.
           */
        }
      },
    },
  })
}
