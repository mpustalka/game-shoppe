import { NextResponse } from "next/server"

import {
  getCompanyMembership,
} from "@/lib/company-auth"
import {
  resolveBusinessPermissions,
} from "@/lib/business-permissions"
import {
  isSuperAdmin,
} from "@/lib/platform-auth"
import {
  createClient,
} from "@/lib/supabase/server"

export const dynamic =
  "force-dynamic"

export async function GET() {
  const supabase =
    await createClient()

  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser()

  if (
    error ||
    !user
  ) {
    return NextResponse.json(
      {
        authenticated: false,
        accountType: null,
        isSuperAdmin: false,
        user: null,
        company: null,
      },
      {
        status: 200,
      },
    )
  }

  const superAdmin =
    await isSuperAdmin(user)

  if (superAdmin) {
    return NextResponse.json({
      authenticated: true,

      accountType:
        "super_admin",

      isSuperAdmin: true,

      user: {
        id: user.id,
        email:
          user.email ??
          null,
      },

      company: null,
    })
  }

  const membership =
    await getCompanyMembership(
      user.id,
    )

  if (!membership) {
    return NextResponse.json({
      authenticated: true,

      accountType:
        "individual",

      isSuperAdmin: false,

      user: {
        id: user.id,
        email:
          user.email ??
          null,
      },

      company: null,
    })
  }

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("companies")
    .select(
      `
        id,
        name,
        slug,
        subscription_status,
        subscription_plan,
        billing_interval,
        trial_plan,
        trial_started_at,
        trial_ends_at,
        included_seats
      `,
    )
    .eq(
      "id",
      membership.companyId,
    )
    .maybeSingle()

  if (companyError) {
    console.error(
      "Unable to load company access information:",
      companyError,
    )
  }

  return NextResponse.json({
    authenticated: true,

    accountType:
      "business",

    isSuperAdmin: false,

    user: {
      id: user.id,
      email:
        user.email ??
        null,
    },

    company: {
      id:
        membership.companyId,

      name:
        company?.name ??
        null,

      slug:
        company?.slug ??
        null,

      role:
        membership.role,

      permissions:
  resolveBusinessPermissions(
    membership.role,
    membership.permissions,
  ),

permissionOverrides:
  membership.permissions,

      membershipStatus:
        membership.status,

      subscriptionStatus:
        company?.subscription_status ??
        null,

      subscriptionPlan:
        company?.subscription_plan ??
        null,

      billingInterval:
        company?.billing_interval ??
        null,

      trialPlan:
        company?.trial_plan ??
        null,

      trialStartedAt:
        company?.trial_started_at ??
        null,

      trialEndsAt:
        company?.trial_ends_at ??
        null,

      includedSeats:
        company?.included_seats ??
        null,
    },
  })
}
