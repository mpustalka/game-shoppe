import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { supabaseTable } from "@/lib/supabase"
import { isAdminUser } from "@/lib/auth"
import { resolveEntitlements } from "@/lib/subscription-server"

export const dynamic = "force-dynamic"

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

type SellBinderRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  slug: string | null
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type PurchasedBinderRow = {
  id: string
}

/**
 * ============================================================
 * SELL BINDER RULES
 * ============================================================
 *
 * Basic:
 *   1 included Sell Binder
 *
 * Premium:
 *   3 included Sell Binders
 *
 * Admin:
 *   Unlimited
 *
 * Additional binders:
 *   $1 each
 *
 * The purchased binder system can be connected to payments
 * later. For now this route will count rows from
 * sell_binder_purchases if that table exists.
 */

const BASIC_INCLUDED_BINDERS = 1
const PREMIUM_INCLUDED_BINDERS = 3

const ADDITIONAL_BINDER_PRICE = 1

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * GET /api/sell-binders
 *
 * Returns:
 * - seller plan
 * - binder entitlement
 * - user's Sell Binders
 */

export async function GET() {
  try {
    /**
     * --------------------------------------------------------
     * AUTHENTICATED USER
     * --------------------------------------------------------
     */

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * ADMIN CHECK
     * --------------------------------------------------------
     */

    const admin = isAdminUser(user)

    /**
     * --------------------------------------------------------
     * SUBSCRIPTION
     * --------------------------------------------------------
     */

    let plan: "basic" | "premium" | "admin" = "basic"

    if (admin) {
      plan = "admin"
    } else {
      try {
        const result = await resolveEntitlements()

        /**
         * resolveEntitlements() may expose the subscription
         * differently depending on the current implementation.
         *
         * We intentionally inspect common entitlement fields.
         */

        const entitlementData = result?.entitlements as
          | Record<string, unknown>
          | null
          | undefined

        const possibleTier =
          entitlementData?.tier ??
          entitlementData?.plan ??
          entitlementData?.subscriptionTier

        if (possibleTier === "premium" || possibleTier === "pro") {
          plan = "premium"
        }
      } catch (error) {
        console.warn("Sell binder entitlement lookup failed:", error)
      }
    }

    /**
     * --------------------------------------------------------
     * LOAD SELL BINDERS
     * --------------------------------------------------------
     */

    const binderResult = await supabaseTable("sell_binders", {
      select: "*",

      filters: [`user_id=eq.${user.id}`],

      order: "sort_order.asc,created_at.asc",

      limit: 500,
    }).catch((error) => {
      console.error("Unable to load sell_binders:", error)

      return []
    })

    const binders = Array.isArray(binderResult)
      ? (binderResult as SellBinderRow[])
      : []

    /**
     * --------------------------------------------------------
     * PURCHASED BINDER ALLOWANCE
     * --------------------------------------------------------
     *
     * This is intentionally safe.
     *
     * If sell_binder_purchases has not been created yet,
     * purchased simply remains 0.
     */

    let purchased = 0

    if (!admin) {
      try {
        const purchaseResult = await supabaseTable("sell_binder_purchases", {
          select: "id",

          filters: [`user_id=eq.${user.id}`, "status=eq.confirmed"],

          limit: 500,
        })

        const purchases = Array.isArray(purchaseResult)
          ? (purchaseResult as PurchasedBinderRow[])
          : []

        purchased = purchases.length
      } catch {
        purchased = 0
      }
    }

    /**
     * --------------------------------------------------------
     * CALCULATE ALLOWANCE
     * --------------------------------------------------------
     */

    const included =
      plan === "premium"
        ? PREMIUM_INCLUDED_BINDERS
        : plan === "admin"
          ? 0
          : BASIC_INCLUDED_BINDERS

    const used = binders.length

    const maximum = plan === "admin" ? 999999 : included + purchased

    const remaining = plan === "admin" ? 999999 : Math.max(0, maximum - used)

    /**
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json({
      plan,

      entitlement: {
        included,

        purchased,

        maximum,

        used,

        remaining,

        unlimited: plan === "admin",

        additionalBinderPrice: ADDITIONAL_BINDER_PRICE,
      },

      binders,
    })
  } catch (error) {
    console.error("Sell binders GET failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Sell Binders",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * ============================================================
 * POST
 * ============================================================
 *
 * POST /api/sell-binders
 *
 * Creates a new Sell Binder.
 */

export async function POST(request: Request) {
  try {
    /**
     * --------------------------------------------------------
     * AUTH
     * --------------------------------------------------------
     */

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * REQUEST BODY
     * --------------------------------------------------------
     */

    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        {
          status: 400,
        },
      )
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""

    const description =
      typeof body.description === "string" ? body.description.trim() : ""

    const isPublic = body.isPublic !== false

    if (!name) {
      return NextResponse.json(
        {
          error: "Sell Binder name is required",
        },
        {
          status: 400,
        },
      )
    }

    if (name.length > 80) {
      return NextResponse.json(
        {
          error: "Sell Binder name cannot exceed 80 characters",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * --------------------------------------------------------
     * ADMIN
     * --------------------------------------------------------
     */

    const admin = isAdminUser(user)

    /**
     * --------------------------------------------------------
     * PLAN
     * --------------------------------------------------------
     */

    let plan: "basic" | "premium" | "admin" = "basic"

    if (admin) {
      plan = "admin"
    } else {
      try {
        const result = await resolveEntitlements()

        const entitlementData = result?.entitlements as
          | Record<string, unknown>
          | null
          | undefined

        const possibleTier =
          entitlementData?.tier ??
          entitlementData?.plan ??
          entitlementData?.subscriptionTier

        if (possibleTier === "premium" || possibleTier === "pro") {
          plan = "premium"
        }
      } catch (error) {
        console.warn("Sell binder entitlement lookup failed:", error)
      }
    }

    /**
     * --------------------------------------------------------
     * EXISTING BINDERS
     * --------------------------------------------------------
     */

    const existingResult = await supabaseTable("sell_binders", {
      select: "id",

      filters: [`user_id=eq.${user.id}`],

      limit: 500,
    })

    const existing = Array.isArray(existingResult) ? existingResult : []

    /**
     * --------------------------------------------------------
     * PURCHASED BINDERS
     * --------------------------------------------------------
     */

    let purchased = 0

    if (!admin) {
      try {
        const purchaseResult = await supabaseTable("sell_binder_purchases", {
          select: "id",

          filters: [`user_id=eq.${user.id}`, "status=eq.confirmed"],

          limit: 500,
        })

        purchased = Array.isArray(purchaseResult) ? purchaseResult.length : 0
      } catch {
        purchased = 0
      }
    }

    /**
     * --------------------------------------------------------
     * ENFORCE LIMIT
     * --------------------------------------------------------
     */

    if (!admin) {
      const included =
        plan === "premium" ? PREMIUM_INCLUDED_BINDERS : BASIC_INCLUDED_BINDERS

      const maximum = included + purchased

      if (existing.length >= maximum) {
        return NextResponse.json(
          {
            error: "You have reached your Sell Binder limit.",

            code: "SELL_BINDER_LIMIT_REACHED",

            entitlement: {
              plan,

              included,

              purchased,

              maximum,

              used: existing.length,

              remaining: 0,

              additionalBinderPrice: ADDITIONAL_BINDER_PRICE,
            },
          },
          {
            status: 403,
          },
        )
      }
    }

    /**
     * --------------------------------------------------------
     * SLUG
     * --------------------------------------------------------
     */

    const slugBase =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "sell-binder"

    /**
     * Add a short random suffix so users can create binders
     * with similar names without slug collisions.
     */

    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8)

    const slug = `${slugBase}-${suffix}`

    /**
     * --------------------------------------------------------
     * CREATE
     * --------------------------------------------------------
     */

    const createdResult = await supabaseTable("sell_binders", {
      method: "POST",

      body: {
        user_id: user.id,

        name,

        description: description || null,

        slug,

        is_public: isPublic,

        is_active: true,

        sort_order: existing.length,
      },
    })

    /**
     * supabaseTable uses Prefer:return=representation,
     * so POST should return an array containing the row.
     */

    const created = Array.isArray(createdResult)
      ? createdResult[0]
      : createdResult

    return NextResponse.json(
      {
        success: true,

        binder: created,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error("Sell binder POST failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Sell Binder",
      },
      {
        status: 500,
      },
    )
  }
}