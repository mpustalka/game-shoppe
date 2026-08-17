import { NextResponse } from "next/server"

import { resolveEntitlements } from "@/lib/subscription-server"
import { DEFAULT_ENTITLEMENTS } from "@/lib/entitlements"

// Returns the signed-in account's computed subscription entitlements.
//
// The browser uses this endpoint to:
// - render current plan
// - show trial status
// - lock Premium features
// - display Basic / Premium upgrade UI
//
// Entitlements are computed server-side so the client cannot spoof access.
export async function GET() {
  try {
    const { user, entitlements } = await resolveEntitlements()

    if (!user || !entitlements) {
      return NextResponse.json({
        signedIn: false,
        email: null,
        entitlements: DEFAULT_ENTITLEMENTS,
      })
    }

    return NextResponse.json({
      signedIn: true,

      email: user.email ?? null,

      entitlements,
    })
  } catch (error) {
    console.error("Subscription entitlement lookup failed:", error)

    /**
     * Preserve your existing fail-open behavior.
     *
     * A billing/database hiccup should not make an existing
     * collection suddenly disappear or lock the whole app.
     */
    return NextResponse.json({
      signedIn: false,
      email: null,
      entitlements: DEFAULT_ENTITLEMENTS,
    })
  }
}
