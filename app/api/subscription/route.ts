import { NextResponse } from "next/server"

import { resolveEntitlements } from "@/lib/subscription-server"
import { DEFAULT_ENTITLEMENTS } from "@/lib/entitlements"

// Returns the signed-in account's billing entitlements. The client billing hook
// reads this to gate features and render the trial / upgrade UI. Computed
// server-side so the browser can't spoof its own access level.
export async function GET() {
  try {
    const { user, entitlements } = await resolveEntitlements()

    if (!user || !entitlements) {
      // Not signed in — hand back conservative defaults so public code paths
      // don't crash. Middleware already gates the real app behind auth.
      return NextResponse.json({
        signedIn: false,
        entitlements: DEFAULT_ENTITLEMENTS,
      })
    }

    return NextResponse.json({
      signedIn: true,
      email: user.email,
      entitlements,
    })
  } catch {
    // Never block the app on a billing hiccup.
    return NextResponse.json({
      signedIn: false,
      entitlements: DEFAULT_ENTITLEMENTS,
    })
  }
}
