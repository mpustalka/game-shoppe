import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Server-side Supabase client bound to the request's cookies, for use in
// Server Components, Route Handlers, and the email-confirmation callback.
// It reads the signed-in user's session from cookies so auth state is
// available on the server.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // `setAll` can be called from a Server Component, where writing
          // cookies is not allowed. The middleware refreshes the session, so
          // this can be safely ignored.
        }
      },
    },
  })
}
