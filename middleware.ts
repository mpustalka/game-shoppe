import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Routes that are reachable without signing in. Everything else requires an
// authenticated session, so the dashboard and navigation stay private until a
// user logs in.
const PUBLIC_PATHS = ["/welcome", "/login", "/reset-password", "/auth", "/share"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

// The middleware keeps the Supabase auth session fresh (rotating tokens on
// every request) AND gates the app: unauthenticated visitors are sent to the
// public landing page, while signed-in users are kept out of the auth pages.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // If Supabase isn't configured, never break the request (and don't gate).
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

  let user = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    // Treat an auth hiccup as "not signed in" rather than crashing.
  }

  const { pathname } = request.nextUrl

  // API routes manage their own access (and return JSON). Don't rewrite them to
  // an HTML landing page — just let them through with a refreshed session.
  if (pathname.startsWith("/api")) {
    return response
  }

  // Not signed in and asking for a protected page → send to the landing page.
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/welcome"
    url.search = ""
    return NextResponse.redirect(url)
  }

  // Already signed in but sitting on the landing or login page → go to the app.
  if (user && (pathname === "/welcome" || pathname === "/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
