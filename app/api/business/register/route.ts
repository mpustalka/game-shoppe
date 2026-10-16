import "server-only"

import crypto from "node:crypto"

import { NextResponse } from "next/server"

import {
  encryptSensitiveValue,
  validateBusinessEncryption,
} from "@/lib/business-encryption"

import {
  createAdminClient,
  hasAdminConfig,
} from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type BusinessPlan =
  | "starter"
  | "pro"
  | "plus"

type BillingInterval =
  | "monthly"
  | "yearly"

type RegisterBody = {
  legalName?: string
  dbaName?: string
  ein?: string

  businessType?: string
  businessPhone?: string
  businessEmail?: string
  website?: string

  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  countryCode?: string

  yearEstablished?: string | number
  estimatedInventorySize?: string
  primarySalesChannel?: string
  businessNotes?: string

  platforms?: string[]
  customPlatformName?: string

  ownerName?: string
  ownerEmail?: string
  password?: string

  plan?: BusinessPlan
  billingInterval?: BillingInterval
}

const PLAN_CONFIG = {
  starter: {
    name: "Business Starter",

    monthly: 9.99,
    yearly: 49.99,

    paidSeats: 1,

    integrations: 1,
    integrationLabel: "Square",

    support: "email",

    virtualEmployeeHours: 0,
    virtualEmployeeRate: 10,
  },

  pro: {
    name: "Business Pro",

    monthly: 19.99,
    yearly: 149.99,

    paidSeats: 5,

    integrations: 3,
    integrationLabel: "Up to 3",

    support: "chat",

    virtualEmployeeHours: 4,
    virtualEmployeeRate: 8,
  },

  plus: {
    name: "Business Plus",

    monthly: 29.99,
    yearly: 199.99,

    paidSeats: 10,

    integrations: null,
    integrationLabel: "Unlimited",

    support:
      "dedicated_account_specialist",

    virtualEmployeeHours: 12,
    virtualEmployeeRate: 5,
  },
} as const

/*
 * Every new Business account receives the Pro
 * software feature set for seven days.
 *
 * Paid labor/service credits are NOT granted
 * merely because the account is trialing Pro.
 */
const TRIAL_PLAN: BusinessPlan =
  "pro"

const TRIAL_DAYS = 7

const TRIAL_INCLUDED_SEATS =
  PLAN_CONFIG.pro.paidSeats

const BUSINESS_TYPES =
  new Set([
    "card_shop",
    "online_seller",
    "breaker",
    "collectibles_store",
    "hobby_shop",
    "other",
  ])

const PLATFORM_IDS =
  new Set([
    "square",
    "shopify",
    "clover",
    "lightspeed",
    "paypal_zettle",
    "stripe",
    "woocommerce",
    "bigcommerce",
    "tcgplayer",
    "ebay",
    "whatnot",
    "amazon",
    "other",
  ])

function cleanText(
  value: unknown,
  maxLength: number,
) {
  if (
    typeof value !== "string"
  ) {
    return ""
  }

  return value
    .trim()
    .slice(0, maxLength)
}

function normalizeEmail(
  value: unknown,
) {
  return cleanText(
    value,
    320,
  ).toLowerCase()
}

function normalizeWebsite(
  value: unknown,
) {
  const raw =
    cleanText(
      value,
      500,
    )

  if (!raw) {
    return null
  }

  try {
    const normalized =
      /^https?:\/\//i.test(raw)
        ? raw
        : `https://${raw}`

    const url =
      new URL(normalized)

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

function normalizeEin(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return ""
  }

  return value.replace(
    /\D/g,
    "",
  )
}

function normalizeCountryCode(
  value: unknown,
) {
  const code =
    cleanText(
      value,
      2,
    ).toUpperCase()

  return code || "US"
}

function normalizeYear(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null
  }

  const year =
    Number(value)

  const currentYear =
    new Date().getFullYear()

  if (
    !Number.isInteger(year) ||
    year < 1800 ||
    year > currentYear
  ) {
    return null
  }

  return year
}

function slugify(
  value: string,
) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(0, 60)
}


async function makeUniqueSlug(
  admin: ReturnType<
    typeof createAdminClient
  >,
  businessName: string,
) {
  const base =
    slugify(businessName) ||
    "business"

  for (
    let attempt = 0;
    attempt < 25;
    attempt += 1
  ) {
    const suffix =
      attempt === 0
        ? ""
        : `-${crypto
            .randomBytes(3)
            .toString("hex")}`

    const candidate =
      `${base}${suffix}`.slice(
        0,
        80,
      )

    const {
      data,
      error,
    } = await admin
      .from("companies")
      .select("id")
      .eq(
        "slug",
        candidate,
      )
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return candidate
    }
  }

  return `${base}-${Date.now()}`
}

function planPrice(
  plan: BusinessPlan,
  interval: BillingInterval,
) {
  return PLAN_CONFIG[plan][
    interval
  ]
}

export async function POST(
  request: Request,
) {
  if (!hasAdminConfig()) {
    console.error(
      "Business registration unavailable: Supabase admin configuration missing",
    )

    return NextResponse.json(
      {
        error:
          "Business registration is temporarily unavailable.",
      },
      {
        status: 500,
      },
    )
  }

  /*
   * Fail before creating anything if our
   * encryption configuration is invalid.
   */
  try {
  validateBusinessEncryption()
} catch (error) {
    console.error(
      "Business encryption configuration error:",
      error instanceof Error
        ? error.message
        : error,
    )

    return NextResponse.json(
      {
        error:
          "Business registration is temporarily unavailable.",
      },
      {
        status: 500,
      },
    )
  }

  let body: RegisterBody

  try {
    body =
      (await request.json()) as RegisterBody
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid registration request.",
      },
      {
        status: 400,
      },
    )
  }

  // ==========================================
  // BUSINESS
  // ==========================================

  const legalName =
    cleanText(
      body.legalName,
      180,
    )

  const dbaName =
    cleanText(
      body.dbaName,
      180,
    )

  const businessType =
    cleanText(
      body.businessType,
      50,
    )

  const businessPhone =
    cleanText(
      body.businessPhone,
      50,
    )

  const businessEmail =
    normalizeEmail(
      body.businessEmail,
    )

  const websiteRaw =
    cleanText(
      body.website,
      500,
    )

  const website =
    websiteRaw
      ? normalizeWebsite(
          websiteRaw,
        )
      : null

  // ==========================================
  // ADDRESS
  // ==========================================

  const addressLine1 =
    cleanText(
      body.addressLine1,
      200,
    )

  const addressLine2 =
    cleanText(
      body.addressLine2,
      200,
    )

  const city =
    cleanText(
      body.city,
      120,
    )

  const state =
    cleanText(
      body.state,
      100,
    )

  const postalCode =
    cleanText(
      body.postalCode,
      30,
    )

  const countryCode =
    normalizeCountryCode(
      body.countryCode,
    )

  // ==========================================
  // PRIVATE TAX DATA
  // ==========================================

  const ein =
    normalizeEin(
      body.ein,
    )

  // ==========================================
  // PROFILE
  // ==========================================

  const yearEstablished =
    normalizeYear(
      body.yearEstablished,
    )

  const estimatedInventorySize =
    cleanText(
      body.estimatedInventorySize,
      80,
    )

  const primarySalesChannel =
    cleanText(
      body.primarySalesChannel,
      100,
    )

  const businessNotes =
    cleanText(
      body.businessNotes,
      2000,
    )

  // ==========================================
  // OWNER
  // ==========================================

  const ownerName =
    cleanText(
      body.ownerName,
      160,
    )

  const ownerEmail =
    normalizeEmail(
      body.ownerEmail,
    )

  const password =
    typeof body.password ===
    "string"
      ? body.password
      : ""

  // ==========================================
  // PLAN
  // ==========================================

  const plan =
    body.plan

  const billingInterval =
    body.billingInterval

  // ==========================================
  // VALIDATION
  // ==========================================

  if (!legalName) {
    return NextResponse.json(
      {
        error:
          "Legal business name is required.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    !BUSINESS_TYPES.has(
      businessType,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Select a valid business type.",
      },
      {
        status: 400,
      },
    )
  }

  if (ein.length !== 9) {
    return NextResponse.json(
      {
        error:
          "Enter a valid 9-digit EIN.",
      },
      {
        status: 400,
      },
    )
  }

  if (!businessPhone) {
    return NextResponse.json(
      {
        error:
          "Business phone number is required.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    businessEmail &&
    !businessEmail.includes("@")
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid business email.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    websiteRaw &&
    !website
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid website.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    !addressLine1 ||
    !city ||
    !state ||
    !postalCode ||
    !countryCode
  ) {
    return NextResponse.json(
      {
        error:
          "Complete the required business address.",
      },
      {
        status: 400,
      },
    )
  }

  if (!ownerName) {
    return NextResponse.json(
      {
        error:
          "Owner name is required.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    !ownerEmail ||
    !ownerEmail.includes("@")
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid owner email.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    password.length < 8
  ) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 8 characters.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    !plan ||
    !Object.prototype.hasOwnProperty.call(
      PLAN_CONFIG,
      plan,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Select a valid Business plan.",
      },
      {
        status: 400,
      },
    )
  }

  if (
    billingInterval !==
      "monthly" &&
    billingInterval !==
      "yearly"
  ) {
    return NextResponse.json(
      {
        error:
          "Select monthly or yearly billing.",
      },
      {
        status: 400,
      },
    )
  }

  // ==========================================
  // PLATFORM REPORTING
  // ==========================================

  const requestedPlatforms =
    Array.isArray(
      body.platforms,
    )
      ? body.platforms
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
              "string",
          )
          .map((value) =>
            value
              .trim()
              .toLowerCase(),
          )
      : []

  const platforms = [
    ...new Set(
      requestedPlatforms.filter(
        (provider) =>
          PLATFORM_IDS.has(
            provider,
          ),
      ),
    ),
  ]

  const customPlatformName =
    cleanText(
      body.customPlatformName,
      120,
    )

  if (
    platforms.includes(
      "other",
    ) &&
    !customPlatformName
  ) {
    return NextResponse.json(
      {
        error:
          "Enter the name of your other sales or POS platform.",
      },
      {
        status: 400,
      },
    )
  }

  // ==========================================
  // SERVER-CONTROLLED ENTITLEMENTS
  // ==========================================

  const selectedPrice =
    planPrice(
      plan,
      billingInterval,
    )

  const trialStartedAt =
    new Date()

  const trialEndsAt =
    new Date(
      trialStartedAt.getTime() +
        TRIAL_DAYS *
          24 *
          60 *
          60 *
          1000,
    )

  const admin =
    createAdminClient()

  let createdUserId:
    | string
    | null = null

  let createdCompanyId:
    | string
    | null = null

  try {
    // ========================================
    // AUTH USER
    // ========================================

    const {
      data: userData,
      error: userError,
    } =
      await admin.auth.admin.createUser(
        {
          email:
            ownerEmail,

          password,

          email_confirm:
            true,

          user_metadata: {
            full_name:
              ownerName,

            account_type:
              "business",

            legal_business_name:
              legalName,

            dba_name:
              dbaName ||
              undefined,
          },
        },
      )

    if (userError) {
      const message =
        userError.message.toLowerCase()

      if (
        message.includes(
          "already",
        ) ||
        message.includes(
          "registered",
        ) ||
        message.includes(
          "exists",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "An account already exists with this email address.",
          },
          {
            status: 409,
          },
        )
      }

      throw userError
    }

    const user =
      userData.user

    if (!user) {
      throw new Error(
        "Supabase did not return the newly created user.",
      )
    }

    createdUserId =
      user.id

    // ========================================
    // COMPANY
    // ========================================

    const slug =
      await makeUniqueSlug(
        admin,
        dbaName ||
          legalName,
      )

    const {
      data: company,
      error: companyError,
    } = await admin
      .from("companies")
      .insert({
        /*
         * name remains the display/public name
         * used by the existing application.
         */
        name:
          dbaName ||
          legalName,

        slug,

        legal_name:
          legalName,

        dba_name:
          dbaName ||
          null,

        business_type:
          businessType,

        website_url:
          website,

        /*
         * Preserve the existing phone field
         * while also populating the new,
         * explicit business_phone field.
         */
        phone:
          businessPhone,

        business_phone:
          businessPhone,

        business_email:
          businessEmail ||
          ownerEmail,

        address_line_1:
          addressLine1,

        address_line_2:
          addressLine2 ||
          null,

        city,

        state,

        postal_code:
          postalCode,

        country_code:
          countryCode,

        year_established:
          yearEstablished,

        estimated_inventory_size:
          estimatedInventorySize ||
          null,

        primary_sales_channel:
          primarySalesChannel ||
          null,

        business_notes:
          businessNotes ||
          null,

        /*
         * This is the PAID plan the customer
         * intends to activate after trial.
         */
        subscription_plan:
          plan,

        billing_interval:
          billingInterval,

        subscription_price:
          selectedPrice,

        /*
         * Current access is a seven-day
         * Business Pro trial.
         */
        subscription_status:
          "trialing",

        subscription_started_at:
          null,

        trial_plan:
          TRIAL_PLAN,

        trial_started_at:
          trialStartedAt.toISOString(),

        trial_ends_at:
          trialEndsAt.toISOString(),

        /*
         * Trial receives Pro software seats.
         * Paid-plan seat allowance will be
         * applied when billing activates.
         */
        included_seats:
          TRIAL_INCLUDED_SEATS,

        promo_code:
          null,

        promo_started_at:
          null,

        promo_ends_at:
          null,
      })
      .select(
        `
          id,
          name,
          slug,
          subscription_plan,
          billing_interval,
          subscription_price,
          subscription_status,
          trial_plan,
          trial_started_at,
          trial_ends_at,
          included_seats
        `,
      )
      .single()

    if (companyError) {
      throw companyError
    }

    createdCompanyId =
      company.id

    // ========================================
    // OWNER MEMBERSHIP
    // ========================================

    const {
      error: memberError,
    } = await admin
      .from(
        "company_members",
      )
      .insert({
        company_id:
          company.id,

        user_id:
          user.id,

        role:
          "owner",

        status:
          "active",

        permissions: {},

        invited_by:
          null,

        invited_at:
          null,

        joined_at:
          new Date()
            .toISOString(),
      })

    if (memberError) {
      throw memberError
    }

    // ========================================
    // PRIVATE EIN
    // ========================================

    const encryptedEin =
      encryptSensitiveValue(
        ein,
      )

    const {
      error:
        privateDetailsError,
    } = await admin
      .from(
        "company_private_details",
      )
      .insert({
        company_id:
          company.id,

        ein_encrypted:
          encryptedEin,

        ein_last4:
          ein.slice(-4),

        tax_id_type:
          "ein",

        verification_status:
          "unverified",

        verified_at:
          null,

        verified_by:
          null,
      })

    if (
      privateDetailsError
    ) {
      throw privateDetailsError
    }

    // ========================================
    // REPORTED PLATFORMS
    //
    // No credentials are accepted here.
    // These records only tell us which
    // platforms the business currently uses.
    // ========================================

    if (
      platforms.length > 0
    ) {
      const rows =
        platforms.map(
          (provider) => ({
            company_id:
              company.id,

            provider,

            status:
              "disconnected",

            environment:
              "production",

            reported_by_business:
              true,

            custom_provider_name:
              provider ===
              "other"
                ? customPlatformName
                : null,

            connected_at:
              null,
          }),
        )

      const {
        error:
          integrationsError,
      } = await admin
        .from(
          "company_integrations",
        )
        .insert(rows)

      if (
        integrationsError
      ) {
        throw integrationsError
      }
    }

    // ========================================
    // SUCCESS
    //
    // EIN data is deliberately NOT returned.
    // ========================================

    return NextResponse.json(
      {
        success: true,

        company: {
          id:
            company.id,

          name:
            company.name,

          slug:
            company.slug,

          selectedPlan:
            company.subscription_plan,

          billingInterval:
            company.billing_interval,

          price:
            Number(
              company.subscription_price,
            ),

          status:
            company.subscription_status,

          trialPlan:
            company.trial_plan,

          trialEndsAt:
            company.trial_ends_at,
        },

        next:
          "/login?business=created",
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error(
      "Business registration failed:",
      error instanceof Error
        ? error.message
        : error,
    )

    /*
     * Best-effort cleanup.
     *
     * Company child records should disappear
     * through ON DELETE CASCADE where configured.
     */
    if (createdCompanyId) {
      const {
        error: cleanupCompanyError,
      } = await admin
        .from("companies")
        .delete()
        .eq(
          "id",
          createdCompanyId,
        )

      if (
        cleanupCompanyError
      ) {
        console.error(
          "Failed cleaning up company:",
          cleanupCompanyError.message,
        )
      }
    }

    if (createdUserId) {
      const {
        error: cleanupUserError,
      } =
        await admin.auth.admin.deleteUser(
          createdUserId,
        )

      if (
        cleanupUserError
      ) {
        console.error(
          "Failed cleaning up auth user:",
          cleanupUserError.message,
        )
      }
    }

    return NextResponse.json(
      {
        error:
          "Unable to create the business account. Please try again.",
      },
      {
        status: 500,
      },
    )
  }
}
