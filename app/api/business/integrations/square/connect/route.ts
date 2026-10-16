
import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireCompanyPermission } from "@/lib/company-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getEncryptionKey(): Buffer {
  const encoded = process.env.BUSINESS_DATA_ENCRYPTION_KEY

  if (!encoded) {
    throw new Error("BUSINESS_DATA_ENCRYPTION_KEY is missing")
  }

  const key = Buffer.from(encoded, "base64")

  if (key.length !== 32) {
    throw new Error(
      "BUSINESS_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes",
    )
  }

  return key
}

function createState(companyId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      companyId,
      nonce: crypto.randomBytes(24).toString("base64url"),
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url")

  const signature = crypto
    .createHmac("sha256", getEncryptionKey())
    .update(payload)
    .digest("base64url")

  return `${payload}.${signature}`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCompanyPermission("integrations.manage")

    if (auth instanceof NextResponse) {
      return auth
    }

    if (!auth.companyId) {
      return NextResponse.redirect(
        new URL(
          "/business/integrations?error=company_required",
          request.url,
        ),
      )
    }

    const applicationId = process.env.SQUARE_APPLICATION_ID
    const environment =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "production"
        : "sandbox"

    if (!applicationId) {
      return NextResponse.redirect(
        new URL(
          "/business/integrations?error=square_not_configured",
          request.url,
        ),
      )
    }

    const redirectUri =
      process.env.SQUARE_OAUTH_REDIRECT_URI ||
      `${new URL(request.url).origin}/api/business/integrations/square/callback`

    const scopes = [
      "MERCHANT_PROFILE_READ",
      "ITEMS_READ",
      "ITEMS_WRITE",
      "INVENTORY_READ",
      "INVENTORY_WRITE",
      "ORDERS_READ",
      "ORDERS_WRITE",
      "PAYMENTS_READ",
    ]

    const params = new URLSearchParams({
  client_id: applicationId,
  response_type: "code",
  scope: scopes.join(" "),
  state: createState(auth.companyId),
})

const baseUrl =
  environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com"

return NextResponse.redirect(
  `${baseUrl}/oauth2/authorize?${params.toString()}`
)
  } catch (error) {
    console.error("Square connect error:", error)

    return NextResponse.redirect(
      new URL(
        "/business/integrations?error=square_connect_failed",
        request.url,
      ),
    )
  }
}
