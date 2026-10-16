import {
  NextResponse,
} from "next/server"

import {
  createAdminClient,
} from "@/lib/supabase/admin"

import {
  requireCompanyPermission,
} from "@/lib/company-auth"

import {
  hasBusinessPermission,
} from "@/lib/business-permissions"

type IntegrationRow = {
  id: string
  company_id: string
  provider: string
  status: string
  environment: string
  application_id: string | null
  location_id: string | null
  merchant_id: string | null
  external_account_name: string | null
  location_name: string | null
  settings: Record<
    string,
    unknown
  > | null
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
  reported_by_business: boolean
  custom_provider_name: string | null
  connected_at: string | null
  disconnected_at: string | null
  token_expires_at: string | null
  created_at: string
  updated_at: string
}

type CompanyRow = {
  id: string
  name: string
  subscription_status:
    | string
    | null
  subscription_plan:
    | string
    | null
  trial_plan:
    | string
    | null
}

const PROVIDERS = [
  {
    id: "square",
    name: "Square",
    description:
      "Sync inventory and sales with your Square point-of-sale account.",
    category: "pos",
    available: true,
  },

  {
    id: "shopify",
    name: "Shopify",
    description:
      "Connect your Shopify store for inventory and product synchronization.",
    category: "ecommerce",
    available: false,
  },

  {
    id: "ebay",
    name: "eBay",
    description:
      "Connect your eBay seller account for listings, inventory, and sales.",
    category: "marketplace",
    available: false,
  },
] as const

function normalizePlan(
  company: CompanyRow,
) {
  const status =
    company.subscription_status
      ?.trim()
      .toLowerCase()

  /*
   * During a trial, trial_plan represents
   * the business entitlement currently
   * being evaluated.
   */
  const rawPlan =
    status === "trialing"
      ? company.trial_plan ||
        company.subscription_plan
      : company.subscription_plan

  const plan =
    rawPlan
      ?.trim()
      .toLowerCase()

  if (
    plan === "starter" ||
    plan === "pro" ||
    plan === "plus"
  ) {
    return plan
  }

  return "starter"
}

function integrationLimit(
  company: CompanyRow,
) {
  const plan =
    normalizePlan(company)

  if (plan === "plus") {
    /*
     * null means unlimited.
     */
    return null
  }

  if (plan === "pro") {
    return 3
  }

  return 1
}

function safeIntegration(
  row: IntegrationRow,
) {
  return {
    id: row.id,

    provider:
      row.provider,

    customProviderName:
      row.custom_provider_name,

    status:
      row.status,

    environment:
      row.environment,

    reportedByBusiness:
      row.reported_by_business,

    merchantId:
      row.merchant_id,

    externalAccountName:
      row.external_account_name,

    locationId:
      row.location_id,

    locationName:
      row.location_name,

    settings:
      row.settings ?? {},

    connectedAt:
      row.connected_at,

    disconnectedAt:
      row.disconnected_at,

    lastSyncAt:
      row.last_sync_at,

    lastSyncStatus:
      row.last_sync_status,

    lastSyncError:
      row.last_sync_error,

    tokenExpiresAt:
      row.token_expires_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }
}

export const dynamic =
  "force-dynamic"

export async function GET() {
  const gate =
    await requireCompanyPermission(
      "integrations.view",
    )

  if (
    gate instanceof NextResponse
  ) {
    return gate
  }

  if (!gate.companyId) {
    return NextResponse.json(
      {
        error:
          "Business context required.",
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
    error: companyError,
  } = await admin
    .from("companies")
    .select(
  `
    id,
    name,
    subscription_status,
    subscription_plan,
    trial_plan
  `,
)
    .eq(
      "id",
      gate.companyId,
    )
    .maybeSingle()

  if (
    companyError ||
    !company
  ) {
    console.error(
      "Unable to load company integrations context:",
      companyError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load business.",
      },
      {
        status: 500,
      },
    )
  }

  const {
    data: rows,
    error: integrationError,
  } = await admin
    .from(
      "company_integrations",
    )
    .select(
      `
        id,
        company_id,
        provider,
        status,
        environment,
        application_id,
        location_id,
        merchant_id,
        external_account_name,
        location_name,
        settings,
        last_sync_at,
        last_sync_status,
        last_sync_error,
        reported_by_business,
        custom_provider_name,
        connected_at,
        disconnected_at,
        token_expires_at,
        created_at,
        updated_at
      `,
    )
    .eq(
      "company_id",
      gate.companyId,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    )

  if (integrationError) {
    console.error(
      "Unable to load company integrations:",
      integrationError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load integrations.",
      },
      {
        status: 500,
      },
    )
  }

  const integrations =
    (rows ?? []) as IntegrationRow[]

  const connected =
    integrations.filter(
      (integration) =>
        integration.status ===
        "connected",
    ).length

  const limit =
    integrationLimit(
      company as CompanyRow,
    )

  const available =
    limit === null
      ? null
      : Math.max(
          0,
          limit - connected,
        )

  /*
   * Build a complete provider catalog.
   *
   * This means a business sees Square,
   * Shopify and eBay even when it did not
   * report using them during registration.
   */
  const catalog =
    PROVIDERS.map(
      (provider) => {
        const existing =
          integrations.find(
            (integration) =>
              integration.provider ===
                provider.id &&
              !integration
                .custom_provider_name,
          )

        return {
          ...provider,

          integration:
            existing
              ? safeIntegration(
                  existing,
                )
              : null,
        }
      },
    )

  /*
   * Include custom/other integrations
   * reported by the business as well.
   */
  const customIntegrations =
    integrations
      .filter(
        (integration) =>
          Boolean(
            integration
              .custom_provider_name,
          ),
      )
      .map(
        safeIntegration,
      )
const canManage =
  gate.isSuperAdmin ||
  (
    gate.membership &&
    gate.companyRole
      ? hasBusinessPermission(
          gate.companyRole,
          gate.membership.permissions,
          "integrations.manage",
        )
      : false
  )
  return NextResponse.json({
    company: {
      id:
        company.id,

      name:
        company.name,

      subscriptionStatus:
        company.subscription_status,

      subscriptionPlan:
        company.subscription_plan,

      trialPlan:
        company.trial_plan,
    },

    currentUser: {
      id:
        gate.user.id,

      role:
        gate.companyRole,

      canManage,
    },

    limits: {
      /*
       * null means unlimited.
       */
      included:
        limit,

      connected,

      available,
    },

    providers:
      catalog,

    customIntegrations,
  })
}
