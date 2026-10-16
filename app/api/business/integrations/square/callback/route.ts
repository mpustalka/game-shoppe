
import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

function encryptSensitiveValue(value: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv,
  )

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])

  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

function verifyState(
  state: string,
): { companyId: string } | null {
  try {
    const [payload, signature] = state.split(".")

    if (!payload || !signature) return null

    const expected = crypto
      .createHmac("sha256", getEncryptionKey())
      .update(payload)
      .digest("base64url")

    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    )

    if (
      typeof data.companyId !== "string" ||
      !data.companyId ||
      typeof data.expiresAt !== "number" ||
      data.expiresAt < Date.now()
    ) {
      return null
    }

    return { companyId: data.companyId }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")

  const redirectToIntegrations = (error: string) =>
    NextResponse.redirect(
      new URL(
        `/business/integrations?error=${encodeURIComponent(error)}`,
        origin,
      ),
    )

  if (oauthError) {
    console.warn("Square authorization was declined:", oauthError)
    return redirectToIntegrations("square_denied")
  }

  if (!code || !state) {
    return redirectToIntegrations("square_invalid_callback")
  }

  const stateData = verifyState(state)

  if (!stateData) {
    return redirectToIntegrations("square_invalid_state")
  }

  try {
    const auth = await requireCompanyPermission(
      "integrations.manage",
      stateData.companyId,
    )

    if (auth instanceof NextResponse) {
      return auth
    }

    if (auth.companyId !== stateData.companyId) {
      return redirectToIntegrations("square_company_mismatch")
    }

    const isProduction =
      process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() ===
      "production"

    const environment = isProduction ? "production" : "sandbox"

    const applicationId = isProduction
      ? process.env.PRODUCTION_APPLICATION_ID
      : process.env.SQUARE_APPLICATION_ID

    const applicationSecret = isProduction
      ? process.env.PRODUCTION_APPLICATION_SECRET
      : process.env.SANDBOX_APPLICATION_SECRET

    const redirectUri = isProduction
      ? process.env.PRODUCTION_SQUARE_OAUTH_REDIRECT_URL
      : process.env.SQUARE_OAUTH_REDIRECT_URL

    if (!applicationId || !applicationSecret) {
      throw new Error(
        `Square ${environment} Application ID or Application Secret is missing`,
      )
    }

    if (!redirectUri) {
      throw new Error(
        `Square ${environment} redirect URL is missing`,
      )
    }

    const baseUrl = isProduction
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com"

    // Exchange the authorization code for seller OAuth tokens.
    // The connect route must use this same redirect URL.
    const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2026-09-16",
      },
      body: JSON.stringify({
        client_id: applicationId,
        client_secret: applicationSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    })

    const responseText = await tokenResponse.text()

    let tokenData: Record<string, any>

    try {
      tokenData = JSON.parse(responseText)
    } catch {
      tokenData = {
        rawResponse: responseText.slice(0, 1000),
      }
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Square token exchange failed:", {
        status: tokenResponse.status,
        message: tokenData.message,
        type: tokenData.type,
        errors: tokenData.errors,
      })

      throw new Error(
        `Square token exchange failed (${tokenResponse.status}): ${
          tokenData.message ?? tokenData.type ?? "See server logs"
        }`,
      )
    }

    const accessToken: string = tokenData.access_token
    const refreshToken: string | undefined = tokenData.refresh_token
    const merchantId: string | undefined = tokenData.merchant_id

    let locationId: string | null = null
    let locationName: string | null = null
    let accountName: string | null = null

    const apiHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2026-09-16",
    }

    if (merchantId) {
      const merchantResponse = await fetch(
        `${baseUrl}/v2/merchants/${encodeURIComponent(merchantId)}`,
        {
          headers: apiHeaders,
          cache: "no-store",
        },
      )

      if (merchantResponse.ok) {
        const merchantData = await merchantResponse.json()

        accountName =
          merchantData.merchant?.business_name ??
          merchantData.merchant?.id ??
          null
      } else {
        console.warn(
          "Could not retrieve Square merchant details:",
          merchantResponse.status,
        )
      }
    }

    const locationsResponse = await fetch(`${baseUrl}/v2/locations`, {
      headers: apiHeaders,
      cache: "no-store",
    })

    if (locationsResponse.ok) {
      const locationsData = await locationsResponse.json()
      const locations = locationsData.locations ?? []

      const location =
        locations.find(
          (item: { status?: string }) => item.status === "ACTIVE",
        ) ?? locations[0]

      if (location) {
        locationId = location.id ?? null
        locationName = location.name ?? null
      }
    } else {
      console.warn(
        "Could not retrieve Square locations:",
        locationsResponse.status,
      )
    }

    const admin = createAdminClient()

    const { error: saveError } = await admin
      .from("company_integrations")
      .upsert(
        {
          company_id: stateData.companyId,
          provider: "square",
          status: "connected",
          environment,
          application_id: applicationId,
          access_token_encrypted: encryptSensitiveValue(accessToken),
          refresh_token_encrypted: refreshToken
            ? encryptSensitiveValue(refreshToken)
            : null,
          merchant_id: merchantId ?? null,
          external_account_name: accountName,
          location_id: locationId,
          location_name: locationName,
          token_expires_at: tokenData.expires_at ?? null,
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          last_sync_at: null,
          last_sync_status: null,
          last_sync_error: null,
          settings: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,provider" },
      )

    if (saveError) {
      console.error("Saving Square integration failed:", saveError)
      throw new Error("Could not save the Square connection")
    }

    return NextResponse.redirect(
      new URL("/business/integrations?connected=square", origin),
    )
  } catch (error) {
    console.error("Square OAuth callback failed:", error)
    return redirectToIntegrations("square_callback_failed")
  }
}
