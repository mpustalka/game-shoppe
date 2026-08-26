import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

import {
  getActiveSubscription,
  type PaymentRow,
} from "@/lib/subscription-server"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type CompanyRow = {
  id: string
  name: string
}

type BinderRow = {
  id: string
  name?: string | null
}

type ShowcaseRow = {
  id: string
  name?: string | null
  share_token?: string | null
}

type DetailWarning = {
  section:
    | "subscription"
    | "payments"
    | "company"
    | "inventory"
    | "binders"
    | "showcases"

  message: string
}

function errorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

/**
 * GET /api/admin/users/[id]/details
 *
 * Admin-only endpoint for loading the complete management
 * overview of ONE selected customer.
 *
 * IMPORTANT:
 *
 * Every database query below uses the UUID supplied in the
 * URL — never the currently signed-in admin's UUID.
 *
 * Example:
 *
 * /api/admin/users/abc-123/details
 *
 * means:
 *
 * "Load abc-123's account"
 *
 * NOT:
 *
 * "Load whoever is currently signed in"
 */
export async function GET(_request: Request, { params }: RouteContext) {
  /**
   * -------------------------------------------------
   * ADMIN SECURITY GATE
   * -------------------------------------------------
   */
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  /**
   * -------------------------------------------------
   * SELECTED USER ID
   * -------------------------------------------------
   */
  const { id: rawId } = await params

  const id = rawId?.trim()

  if (!id) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  if (!looksLikeUuid(id)) {
    return NextResponse.json(
      {
        error: "Invalid user id",
      },
      {
        status: 400,
      },
    )
  }

  try {
    /**
     * This is our privileged SERVER-ONLY client.
     *
     * It is intentionally used here because the admin
     * needs to inspect another user's records.
     */
    const admin = createAdminClient()

    /**
     * We return optional warnings when one secondary
     * section fails.
     *
     * Example:
     *
     * If the binders table changes later, the entire
     * user management page does NOT need to crash.
     */
    const warnings: DetailWarning[] = []

    /**
     * =================================================
     * AUTH USER
     * =================================================
     *
     * This lookup MUST succeed.
     *
     * If the Auth user does not exist, there is no
     * account detail page to display.
     */
    const { data: authData, error: authError } =
      await admin.auth.admin.getUserById(id)

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: authError?.message ?? "User not found",
        },
        {
          status: 404,
        },
      )
    }

    const user = authData.user

    /**
     * -------------------------------------------------
     * USER METADATA
     * -------------------------------------------------
     */
    const metadata = user.user_metadata ?? {}

    const storeName =
      typeof metadata.store_name === "string" ? metadata.store_name : null

    const companyId =
      typeof metadata.company_id === "string" && metadata.company_id.trim()
        ? metadata.company_id.trim()
        : null

    /**
     * =================================================
     * SUBSCRIPTION
     * =================================================
     *
     * getActiveSubscription(id) receives the selected
     * user's UUID explicitly.
     */
    let subscription: {
      paidUntil: string | null

      paidPlan: "basic" | "premium" | null
    } = {
      paidUntil: null,
      paidPlan: null,
    }

    try {
      const resolved = await getActiveSubscription(id)

      subscription = {
        paidUntil: resolved.paidUntil ?? null,

        paidPlan:
          resolved.paidPlan === "basic" || resolved.paidPlan === "premium"
            ? resolved.paidPlan
            : null,
      }
    } catch (error) {
      warnings.push({
        section: "subscription",

        message: errorMessage(error, "Subscription lookup failed"),
      })
    }

    /**
     * =================================================
     * PAYMENTS
     * =================================================
     *
     * Explicit selected-user filter:
     *
     * user_id = URL UUID
     */
    let payments: PaymentRow[] = []

    {
      const { data, error } = await admin
        .from("subscription_payments")
        .select("*")
        .eq("user_id", id)
        .order("created_at", {
          ascending: false,
        })
        .limit(100)

      if (error) {
        warnings.push({
          section: "payments",

          message: error.message,
        })
      } else {
        payments = (data ?? []) as PaymentRow[]
      }
    }

    /**
     * =================================================
     * COMPANY
     * =================================================
     */
    let company: CompanyRow | null = null

    if (companyId) {
      const { data, error } = await admin
        .from("companies")
        .select("id,name")
        .eq("id", companyId)
        .maybeSingle()

      if (error) {
        warnings.push({
          section: "company",

          message: error.message,
        })
      } else if (data) {
        company = data as CompanyRow
      }
    }

    /**
     * =================================================
     * INVENTORY COUNT
     * =================================================
     *
     * IMPORTANT IMPROVEMENT:
     *
     * Previous version downloaded as many as 20,000
     * inventory IDs just to calculate .length.
     *
     * This asks Postgres for COUNT(*) instead.
     *
     * No inventory rows are downloaded.
     */
    let inventoryCount = 0

    {
      const { count, error } = await admin
        .from("inventory_items")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", id)

      if (error) {
        warnings.push({
          section: "inventory",

          message: error.message,
        })
      } else {
        inventoryCount = count ?? 0
      }
    }

    /**
     * =================================================
     * BINDERS
     * =================================================
     *
     * This remains optional so a binder-table schema
     * change cannot destroy the entire admin page.
     */
    let binders: BinderRow[] = []

    {
      const { data, error } = await admin
        .from("binders")
        .select("id,name")
        .eq("user_id", id)
        .order("name", {
          ascending: true,
        })
        .limit(500)

      if (error) {
        warnings.push({
          section: "binders",

          message: error.message,
        })
      } else {
        binders = (data ?? []) as BinderRow[]
      }
    }

    /**
     * =================================================
     * SHOWCASES
     * =================================================
     *
     * Again:
     *
     * user_id = selected URL UUID
     */
    let showcases: ShowcaseRow[] = []

    {
      const { data, error } = await admin
        .from("showcase_binders")
        .select("id,name,share_token")
        .eq("user_id", id)
        .order("updated_at", {
          ascending: false,
        })
        .limit(500)

      if (error) {
        warnings.push({
          section: "showcases",

          message: error.message,
        })
      } else {
        showcases = (data ?? []) as ShowcaseRow[]
      }
    }

    /**
     * =================================================
     * PAYMENT SUMMARY
     * =================================================
     */
    const confirmedPayments = payments.filter(
      (payment) => payment.status === "confirmed",
    )

    const pendingPayments = payments.filter(
      (payment) => payment.status === "pending",
    )

    const rejectedPayments = payments.filter(
      (payment) => payment.status === "rejected",
    )

    const totalPaid = confirmedPayments.reduce((total, payment) => {
      const amount = Number(payment.amount ?? 0)

      return total + (Number.isFinite(amount) ? amount : 0)
    }, 0)

    /**
     * =================================================
     * ACTIVE STATUS
     * =================================================
     */
    const paidUntilTime = subscription.paidUntil
      ? new Date(subscription.paidUntil).getTime()
      : NaN

    const subscriptionActive =
      Number.isFinite(paidUntilTime) && paidUntilTime > Date.now()

    const bannedUntilTime = user.banned_until
      ? new Date(user.banned_until).getTime()
      : NaN

    const suspended =
      Number.isFinite(bannedUntilTime) && bannedUntilTime > Date.now()

    /**
     * =================================================
     * RESPONSE
     * =================================================
     */
    return NextResponse.json({
      /**
       * Useful while developing the admin system.
       *
       * This proves which account was requested and
       * prevents ambiguity between admin vs customer.
       */
      scope: {
        selectedUserId: id,

        adminUserId: gate.user.id,
      },

      user: {
        id: user.id,

        email: user.email ?? null,

        storeName,

        companyId,

        company,

        isAdmin: metadata.is_admin === true,

        confirmed: Boolean(user.email_confirmed_at),

        createdAt: user.created_at,

        lastSignInAt: user.last_sign_in_at ?? null,

        bannedUntil: user.banned_until ?? null,

        suspended,
      },

      subscription: {
        plan: subscription.paidPlan,

        paidUntil: subscription.paidUntil,

        active: subscriptionActive,
      },

      stats: {
        inventoryCount,

        binderCount: binders.length,

        showcaseCount: showcases.length,

        paymentCount: payments.length,

        confirmedPaymentCount: confirmedPayments.length,

        pendingPaymentCount: pendingPayments.length,

        rejectedPaymentCount: rejectedPayments.length,

        totalPaid: Number(totalPaid.toFixed(2)),
      },

      binders,

      showcases,

      payments,

      /**
       * The page can still render if an optional
       * subsystem failed.
       *
       * Later we can display these warnings only to
       * the owner admin.
       */
      warnings,
    })
  } catch (error) {
    console.error("Admin user details GET failed:", error)

    return NextResponse.json(
      {
        error: errorMessage(error, "Unable to load user details"),
      },
      {
        status: 500,
      },
    )
  }
}
