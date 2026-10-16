import { NextResponse } from "next/server"

import {
  requireCompanyMember,
} from "@/lib/company-auth"

import {
  createAdminClient,
} from "@/lib/supabase/admin"

import {
  computeBusinessEntitlements,
} from "@/lib/business-entitlements"

export const dynamic =
  "force-dynamic"

export async function GET() {
  const gate =
    await requireCompanyMember()

  if (
    gate instanceof NextResponse
  ) {
    return gate
  }

  if (!gate.companyId) {
    return NextResponse.json(
      {
        error:
          "Business context required",
        code:
          "company_context_required",
      },
      {
        status: 403,
      },
    )
  }

  const admin =
    createAdminClient()

  const {
    data: company,
    error,
  } = await admin
    .from("companies")
    .select(
      `
        id,
        name,
        subscription_status,
        subscription_plan,
        billing_interval,
        subscription_price,
        subscription_started_at,
        trial_plan,
        trial_started_at,
        trial_ends_at,
        promo_code,
        promo_started_at,
        promo_ends_at,
        included_seats
      `,
    )
    .eq(
      "id",
      gate.companyId,
    )
    .maybeSingle()

  if (error) {
    console.error(
      "Unable to load business subscription:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load business subscription",
      },
      {
        status: 500,
      },
    )
  }

  if (!company) {
    return NextResponse.json(
      {
        error:
          "Business not found",
      },
      {
        status: 404,
      },
    )
  }

  const entitlements =
    computeBusinessEntitlements({
      subscriptionStatus:
        company.subscription_status,

      subscriptionPlan:
        company.subscription_plan,

      billingInterval:
        company.billing_interval,

      trialPlan:
        company.trial_plan,

      trialEndsAt:
        company.trial_ends_at,
    })

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
    },

    role:
      gate.companyRole,

    canManageBilling:
      gate.isSuperAdmin ||
      gate.companyRole === "owner",

    subscription: {
      status:
        company.subscription_status,

      plan:
        company.subscription_plan,

      billingInterval:
        company.billing_interval,

      price:
        company.subscription_price,

      startedAt:
        company.subscription_started_at,

      includedSeats:
        company.included_seats,

      trialPlan:
        company.trial_plan,

      trialStartedAt:
        company.trial_started_at,

      trialEndsAt:
        company.trial_ends_at,

      promoCode:
        company.promo_code,

      promoStartedAt:
        company.promo_started_at,

      promoEndsAt:
        company.promo_ends_at,
    },

    entitlements,
  })
}
