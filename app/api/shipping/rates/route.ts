import { NextResponse } from "next/server"

import {
  easyshipRequest,
  getEasyshipOriginAddress,
} from "@/lib/easyship"
import { createClient } from "@/lib/supabase/server"

/**
 * Temporary Easyship category.
 *
 * This is the Easyship item-category slug, NOT one of our store categories.
 * We'll map store categories/products to Easyship categories later.
 */
const DEFAULT_EASYSHIP_CATEGORY = "books_collectibles"

type ShippingAddressInput = {
  name?: string
  company?: string | null
  line1?: string
  line2?: string | null
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
}

type ShippingRateRequest = {
  destination?: ShippingAddressInput
  totalWeightOz?: number
  declaredValue?: number
}

type EasyshipCourierService = {
  id?: string
  courier_id?: string
  name?: string
  umbrella_name?: string
  logo?: string | null
  easyship_courier_service?: boolean | null
}

type EasyshipRate = {
  courier_service?: EasyshipCourierService

  currency?: string

  shipment_charge?: number
  shipment_charge_total?: number
  total_charge?: number

  min_delivery_time?: number
  max_delivery_time?: number

  cost_rank?: number
  delivery_time_rank?: number
  value_for_money_rank?: number

  tracking_rating?: number
  easyship_rating?: number

  description?: string
  full_description?: string

  available_handover_options?: string[]
}

type EasyshipRatesResponse = {
  rates?: EasyshipRate[]

  meta?: {
    request_id?: string

    pagination?: {
      page?: number
      next?: number | null
      count?: number | null
    }
  }
}

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

function positiveNumber(
  value: unknown,
  fallback: number,
) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function ouncesToKilograms(ounces: number) {
  return ounces * 0.028349523125
}

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // AUTH
    // ---------------------------------------------------------

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to request shipping rates.",
        },
        {
          status: 401,
        },
      )
    }

    // ---------------------------------------------------------
    // REQUEST BODY
    // ---------------------------------------------------------

    let body: ShippingRateRequest

    try {
      body =
        (await request.json()) as ShippingRateRequest
    } catch {
      return NextResponse.json(
        {
          error: "Invalid shipping rate request.",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * IMPORTANT:
     *
     * checkout/page.tsx sends:
     *
     * {
     *   destination: {...},
     *   totalWeightOz: ...
     * }
     *
     * Keep this API contract unless we intentionally change both files.
     */
    const address = body.destination

    if (!address) {
      return NextResponse.json(
        {
          error: "Shipping address is required.",
        },
        {
          status: 400,
        },
      )
    }

    // ---------------------------------------------------------
    // DESTINATION ADDRESS
    // ---------------------------------------------------------

    const name = cleanString(address.name)

    const company = cleanString(
      address.company,
    )

    const address1 = cleanString(
      address.line1,
    )

    const address2 = cleanString(
      address.line2,
    )

    const city = cleanString(
      address.city,
    )

    const state = cleanString(
      address.state,
    )

    const postalCode = cleanString(
      address.postalCode,
    )

    const country =
      cleanString(address.country).toUpperCase() ||
      "US"

    const phone = cleanString(
      address.phone,
    )

    const email =
      cleanString(address.email) ||
      user.email ||
      ""

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          error: "Recipient name is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!address1) {
      return NextResponse.json(
        {
          error: "Street address is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!city) {
      return NextResponse.json(
        {
          error: "City is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!state && country === "US") {
      return NextResponse.json(
        {
          error: "State is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!postalCode) {
      return NextResponse.json(
        {
          error: "Postal code is required.",
        },
        {
          status: 400,
        },
      )
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Email address is required.",
        },
        {
          status: 400,
        },
      )
    }

    // ---------------------------------------------------------
    // WEIGHT
    // ---------------------------------------------------------

    /**
     * Our store uses ounces.
     *
     * Example:
     *
     * 16 oz = 1 lb
     * 224 oz = 14 lb
     *
     * Convert to kg for Easyship.
     */
    const weightOz = positiveNumber(
      body.totalWeightOz,
      1,
    )

    const weightKg = Math.max(
      ouncesToKilograms(weightOz),
      0.001,
    )

    // ---------------------------------------------------------
    // DECLARED VALUE
    // ---------------------------------------------------------

    /**
     * Easyship requires a positive customs value for normal merchandise.
     *
     * Eventually we'll send the real server-validated merchandise value
     * rather than defaulting to $1.
     */
    const declaredValue =
      positiveNumber(
        body.declaredValue,
        1,
      )

    // ---------------------------------------------------------
    // ORIGIN ADDRESS
    // ---------------------------------------------------------

    const configuredOrigin =
      getEasyshipOriginAddress()

    /**
     * getEasyshipOriginAddress() currently returns our internal format:
     *
     * {
     *   name,
     *   line_1,
     *   line_2,
     *   city,
     *   state,
     *   postal_code,
     *   country_alpha2,
     *   phone_number
     * }
     *
     * Convert that into Easyship's actual address schema.
     */
    const originAddress = {
      line_1:
        configuredOrigin.line_1,

      line_2:
        configuredOrigin.line_2 ||
        null,

      city:
        configuredOrigin.city,

      state:
        configuredOrigin.state,

      postal_code:
        configuredOrigin.postal_code,

      country_alpha2:
        configuredOrigin.country_alpha2,

      contact_name:
        configuredOrigin.name,

      company_name:
        configuredOrigin.name || null,

      contact_phone:
        configuredOrigin.phone_number ||
        null,

      contact_email:
        process.env.EASYSHIP_ORIGIN_EMAIL ||
        user.email ||
        "shipping@example.com",
    }

    // ---------------------------------------------------------
    // EASYSHIP DESTINATION
    // ---------------------------------------------------------

    const destinationAddress = {
      line_1: address1,

      line_2:
        address2 || null,

      city,

      state:
        state || null,

      postal_code:
        postalCode,

      country_alpha2:
        country,

      contact_name:
        name,

      company_name:
        company || null,

      contact_phone:
        phone || null,

      contact_email:
        email,
    }

    // ---------------------------------------------------------
    // EASYSHIP REQUEST
    // ---------------------------------------------------------

    /**
     * Easyship's Request Rates documentation supports:
     *
     * 1. Parcel total_actual_weight + box
     * 2. Per-item actual_weight + dimensions
     * 3. SKU lookup
     *
     * For this first working integration we're supplying the parcel's
     * total_actual_weight and a merchandise item.
     *
     * We intentionally are NOT sending item_category_id.
     *
     * Easyship's ParcelItem schema expects:
     *
     * category: "<item category slug>"
     *
     * Example:
     *
     * category: "books_collectibles"
     */
    const easyshipPayload = {
      origin_address:
        originAddress,

      destination_address:
        destinationAddress,

      parcels: [
  {
    total_actual_weight:
      weightKg,

    box: {
      length: 25.4,
      width: 20.32,
      height: 10.16,
    },

    items: [
      {
        description:
          "Pokemon merchandise",

        category:
          DEFAULT_EASYSHIP_CATEGORY,

        quantity: 1,

        origin_country_alpha2:
          "US",

        declared_currency:
          "USD",

        declared_customs_value:
          declaredValue,
      },
    ],
  },
],
    }

    // ---------------------------------------------------------
    // DEBUG LOG
    // ---------------------------------------------------------

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.log(
        "Easyship rate request:",
        JSON.stringify(
          {
            destination: {
              name,
              city,
              state,
              postalCode,
              country,
            },

            weightOz,

            weightKg,

            declaredValue,

            category:
              DEFAULT_EASYSHIP_CATEGORY,

            easyshipPayload,
          },
          null,
          2,
        ),
      )
    }

    // ---------------------------------------------------------
    // CALL EASYSHIP
    // ---------------------------------------------------------

    const easyshipResponse =
      await easyshipRequest<EasyshipRatesResponse>(
        "/rates",
        {
          method: "POST",

          body: JSON.stringify(
            easyshipPayload,
          ),
        },
      )

    // ---------------------------------------------------------
    // DEBUG EASYSHIP RESPONSE
    // ---------------------------------------------------------

    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.log(
        "Easyship rates returned:",
        JSON.stringify(
          easyshipResponse,
          null,
          2,
        ),
      )
    }

    // ---------------------------------------------------------
    // NORMALIZE RATES
    // ---------------------------------------------------------

    const rawRates =
      Array.isArray(
        easyshipResponse.rates,
      )
        ? easyshipResponse.rates
        : []

    const rates = rawRates
      .map((rate) => {
        const courier =
          rate.courier_service

        const amount =
          Number(
            rate.total_charge ??
              rate.shipment_charge_total ??
              rate.shipment_charge ??
              0,
          )

        const courierServiceId =
          courier?.id ?? ""

        const courierId =
          courier?.courier_id ?? ""

        const courierName =
          courier?.umbrella_name ||
          courier?.name ||
          "Shipping"

        const serviceName =
          courier?.name ||
          courier?.umbrella_name ||
          "Shipping"

        return {
          /**
           * Keep id for the current checkout UI.
           */
          id:
            courierServiceId,

          /**
           * Also expose the explicit Easyship IDs because we'll need
           * these when creating the actual shipment/order later.
           */
          courierServiceId,

          courierId,

          courier:
            courierName,

          service:
            serviceName,

          logo:
            courier?.logo ??
            null,

          amount,

          currency:
            rate.currency ??
            "USD",

          minDeliveryDays:
            typeof rate.min_delivery_time ===
            "number"
              ? rate.min_delivery_time
              : null,

          maxDeliveryDays:
            typeof rate.max_delivery_time ===
            "number"
              ? rate.max_delivery_time
              : null,

          costRank:
            typeof rate.cost_rank ===
            "number"
              ? rate.cost_rank
              : null,

          deliveryTimeRank:
            typeof rate.delivery_time_rank ===
            "number"
              ? rate.delivery_time_rank
              : null,

          valueForMoneyRank:
            typeof rate.value_for_money_rank ===
            "number"
              ? rate.value_for_money_rank
              : null,

          trackingRating:
            typeof rate.tracking_rating ===
            "number"
              ? rate.tracking_rating
              : null,

          easyshipRating:
            typeof rate.easyship_rating ===
            "number"
              ? rate.easyship_rating
              : null,

          description:
            rate.description ||
            null,

          fullDescription:
            rate.full_description ||
            null,

          handoverOptions:
            Array.isArray(
              rate.available_handover_options,
            )
              ? rate.available_handover_options
              : [],
        }
      })
      .filter((rate) => {
        return (
          Boolean(
            rate.courierServiceId,
          ) &&
          Number.isFinite(
            rate.amount,
          ) &&
          rate.amount >= 0
        )
      })
      .sort(
        (a, b) =>
          a.amount - b.amount,
      )

    // ---------------------------------------------------------
    // RESPONSE TO CHECKOUT
    // ---------------------------------------------------------

    return NextResponse.json({
      rates,

      meta: {
        requestId:
          easyshipResponse.meta
            ?.request_id ??
          null,

        count:
          rates.length,

        weightOz,

        weightKg,
      },
    })
  } catch (error) {
    console.error(
      "Shipping rates exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve shipping rates.",
      },
      {
        status: 500,
      },
    )
  }
}