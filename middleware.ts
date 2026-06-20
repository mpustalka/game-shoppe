import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// The middleware's only job is to keep the Supabase auth session fresh by
// rotating tokens on every request and writing the refreshed cookies back.
//
// It intentionally does NOT redirect or block any route: the original Card
// Vault instance stays fully public. Authentication is additive — signing in
// simply unlocks per-account features without gating the existing app.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // If Supabase isn't configured for some reason, never break the request.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Touch the user to trigger token refresh; ignore any failure so an auth
  // hiccup never takes down the public site.
  try {
    await supabase.auth.getUser()
  } catch {
    // no-op
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
