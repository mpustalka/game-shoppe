import {
  NextResponse,
  type NextRequest,
} from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
) {
  const {
    searchParams,
    origin,
  } = new URL(request.url)

  const code =
    searchParams.get("code")

  const requestedRedirect =
    searchParams.get("redirect") || "/"

  /*
   * Only permit redirects within this application.
   *
   * This prevents an attacker from turning the
   * authentication callback into an open redirect.
   */
  const redirect =
    requestedRedirect.startsWith("/") &&
    !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/"

  if (code) {
    const supabase =
      await createClient()

    const {
      error,
    } =
      await supabase.auth.exchangeCodeForSession(
        code,
      )

    if (!error) {
      return NextResponse.redirect(
        new URL(
          redirect,
          origin,
        ),
      )
    }

    console.error(
      "Supabase auth callback failed:",
      error,
    )
  }

  return NextResponse.redirect(
    new URL(
      "/login?error=auth",
      origin,
    ),
  )
}