import type { CookieOptionsWithName } from "@supabase/ssr"

// Deploy previews and branch deploys (e.g. agent-123--game-shopp.netlify.app)
// are often viewed embedded in another site, such as the Netlify preview pane.
// Browsers refuse to store or send the default SameSite=Lax session cookie
// inside a cross-site frame, so sign-in "succeeds" but the very next request
// arrives without a session and the middleware sends the user to /welcome.
//
// On those hosts only, the auth cookie is marked SameSite=None; Secure so it
// works when framed. Production domains keep SameSite=Lax, which blocks the
// session cookie from riding along on cross-site form posts.
const PREVIEW_HOST = /--game-shopp\.netlify\.app$/

export function isPreviewHost(hostname: string | null | undefined) {
  if (!hostname) return false
  const host = hostname.toLowerCase().split(":")[0]
  return PREVIEW_HOST.test(host) && !host.startsWith("main--")
}

export function authCookieOptions(
  hostname: string | null | undefined,
): CookieOptionsWithName | undefined {
  return isPreviewHost(hostname)
    ? { sameSite: "none", secure: true }
    : undefined
}
