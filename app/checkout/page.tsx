"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStoreCart } from "@/lib/store-cart"

type ValidatedItem = {
  productId: string
  variantId: string | null
  slug: string
  name: string
  variantName: string | null
  sku: string | null
  imageUrl: string | null

  purchaseType:
    | "single"
    | "case"

  quantity: number
  unitPrice: number
  lineTotal: number

  isPreorder: boolean

  releaseDate:
    | string
    | null
}

type ValidationResponse = {
  items: ValidatedItem[]
  subtotal: number
  totalWeightOz: number
  shippingRequired: boolean
}

type ShippingRate = {
  id: string

  /*
   * Support both the original checkout field names
   * and the normalized names returned by our
   * Easyship API route.
   */
  serviceName?: string
  courierName?: string
  logoUrl?: string | null
  price?: number

  service?: string
  courier?: string
  logo?: string | null
  amount?: number

  courierServiceId?: string
  courierId?: string

  currency: string

  minDeliveryDays:
    | number
    | null

  maxDeliveryDays:
    | number
    | null

  description?: string | null
  fullDescription?: string | null
}

type AddressForm = {
  firstName: string
  lastName: string
  email: string
  phone: string

  address1: string
  address2: string

  city: string
  state: string
  postalCode: string

  country: string
}

type ApiErrorResponse = {
  error?: string
}

type CreatedOrder = {
  id: string
  order_number: string
  status: string
  payment_status: string
  fulfillment_status: string
  subtotal: number
  shipping_amount: number
  tax_amount: number
  discount_amount: number
  total: number
  payment_provider: string | null
  created_at: string
}

type CreateOrderResponse = {
  order?: CreatedOrder
  existing?: boolean
  error?: string
}

type CashAppDetailsResponse = {
  order?: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    paymentSubmittedAt: string | null
    total: number
  }
  cashApp?: {
    payTo: string
    amount: number
    note: string
  }
  error?: string
}

type CashAppSubmissionResponse = {
  ok?: boolean
  order?: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    paymentSubmittedAt: string | null
    total: number
  }
  error?: string
}

const EMPTY_ADDRESS: AddressForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",

  address1: "",
  address2: "",

  city: "",
  state: "",
  postalCode: "",

  country: "US",
}

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(value)
}

/**
 * Safely read an API response.
 *
 * If Next.js returns HTML/text because a route crashed,
 * this gives us the real response instead of a JSON
 * parsing error.
 */
async function readApiResponse<T>(
  response: Response,
  label: string,
): Promise<T> {
  const text =
    await response.text()

  if (!text) {
    if (!response.ok) {
      throw new Error(
        `${label} failed (${response.status} ${response.statusText})`,
      )
    }

    throw new Error(
      `${label} returned an empty response`,
    )
  }

  try {
    return JSON.parse(
      text,
    ) as T
  } catch {
    console.error(
      `${label} returned non-JSON response:`,
      {
        status:
          response.status,

        statusText:
          response.statusText,

        contentType:
          response.headers.get(
            "content-type",
          ),

        response:
          text,
      },
    )

    const preview =
      text
        .replace(
          /\s+/g,
          " ",
        )
        .trim()
        .slice(
          0,
          500,
        )

    throw new Error(
      `${label} returned a non-JSON response (${response.status}). ${preview}`,
    )
  }
}

export default function CheckoutPage() {
  const {
    items,
    hydrated,
    clearCart,
  } = useStoreCart()

  const [
    address,
    setAddress,
  ] =
    useState<AddressForm>(
      EMPTY_ADDRESS,
    )

  const [
    validation,
    setValidation,
  ] =
    useState<ValidationResponse | null>(
      null,
    )

  const [
    validating,
    setValidating,
  ] = useState(false)

  const [
    validationError,
    setValidationError,
  ] = useState("")

  const [
    rates,
    setRates,
  ] =
    useState<ShippingRate[]>(
      [],
    )

  const [
    loadingRates,
    setLoadingRates,
  ] = useState(false)

  const [
    rateError,
    setRateError,
  ] = useState("")

  const [
    selectedRateId,
    setSelectedRateId,
  ] = useState("")

  const [
    paymentStep,
    setPaymentStep,
  ] = useState<
    "shipping" |
    "payment" |
    "cashapp" |
    "submitted"
  >("shipping")

  const [
    creatingOrder,
    setCreatingOrder,
  ] = useState(false)

  const [
    paymentError,
    setPaymentError,
  ] = useState("")

  const [
    createdOrder,
    setCreatedOrder,
  ] = useState<CreatedOrder | null>(null)

  const [
    cashAppDetails,
    setCashAppDetails,
  ] = useState<{
    payTo: string
    amount: number
    note: string
  } | null>(null)

  const [
    submittingPayment,
    setSubmittingPayment,
  ] = useState(false)

  const [
    copied,
    setCopied,
  ] = useState<
    "cashtag" |
    "amount" |
    "note" |
    null
  >(null)

  const [
  checkoutKey,
  setCheckoutKey,
] = useState("")

useEffect(() => {
  if (checkoutKey) {
    return
  }

  if (
    typeof window !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.randomUUID === "function"
  ) {
    setCheckoutKey(
      window.crypto.randomUUID(),
    )

    return
  }

  setCheckoutKey(
    `checkout-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`,
  )
}, [checkoutKey])

  /*
   * Validate the cart immediately after
   * localStorage has hydrated.
   *
   * The server is authoritative for:
   * - prices
   * - stock
   * - variant availability
   * - product availability
   * - weight
   */
  useEffect(() => {
    if (
      !hydrated ||
      !items.length
    ) {
      return
    }

    let cancelled =
      false

    async function validateCart() {
      setValidating(
        true,
      )

      setValidationError(
        "",
      )

      setValidation(
        null,
      )

      try {
        const response =
          await fetch(
            "/api/store/checkout/validate",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              cache:
                "no-store",

              body:
                JSON.stringify({
                  items:
                    items.map(
                      (
                        item,
                      ) => ({
                        productId:
                          item.productId,

                        variantId:
                          item.variantId,

                        purchaseType:
                          item.purchaseType,

                        quantity:
                          item.quantity,
                      }),
                    ),
                }),
            },
          )

        const data =
          await readApiResponse<
            ValidationResponse &
              ApiErrorResponse
          >(
            response,
            "Checkout validation",
          )

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ??
              `Unable to validate cart (${response.status})`,
          )
        }

        if (
          !Array.isArray(
            data.items,
          )
        ) {
          throw new Error(
            "Checkout validation returned invalid cart data.",
          )
        }

        if (
          !cancelled
        ) {
          setValidation({
            items:
              data.items,

            subtotal:
              Number(
                data.subtotal ??
                  0,
              ),

            totalWeightOz:
              Number(
                data.totalWeightOz ??
                  0,
              ),

            shippingRequired:
              Boolean(
                data.shippingRequired,
              ),
          })
        }
      } catch (
        error
      ) {
        console.error(
          "Checkout validation failed:",
          error,
        )

        if (
          !cancelled
        ) {
          setValidationError(
            error instanceof
              Error
              ? error.message
              : "Unable to validate cart",
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setValidating(
            false,
          )
        }
      }
    }

    void validateCart()

    return () => {
      cancelled =
        true
    }
  }, [
    hydrated,
    items,
  ])

  /*
   * Find the currently selected shipping rate.
   */
  const selectedRate =
    useMemo(
      () =>
        rates.find(
          (rate) =>
            rate.id ===
            selectedRateId,
        ) ??
        null,
      [
        rates,
        selectedRateId,
      ],
    )

  /*
   * Support both:
   *
   * old checkout:
   * rate.price
   *
   * new Easyship route:
   * rate.amount
   */
  const selectedShippingPrice =
    selectedRate
      ? Number(
          selectedRate.amount ??
            selectedRate.price ??
            0,
        )
      : 0

  const subtotal =
    validation?.subtotal ??
    0

  const shipping =
    selectedShippingPrice

  const total =
    subtotal +
    shipping

  function updateAddress(
    field:
      keyof AddressForm,
    value: string,
  ) {
    setAddress(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    )

    /*
     * Changing the address invalidates
     * previously returned shipping rates.
     */
    setRates(
      [],
    )

    setSelectedRateId(
      "",
    )

    setRateError(
      "",
    )
  }

  /*
   * Instead of simply returning true/false,
   * tell us EXACTLY which required field is
   * missing.
   *
   * Phone and address line 2 are optional.
   */
  function getMissingAddressFields() {
    const missing: string[] =
      []

    if (
      !address.firstName.trim()
    ) {
      missing.push(
        "first name",
      )
    }

    if (
      !address.lastName.trim()
    ) {
      missing.push(
        "last name",
      )
    }

    if (
      !address.email.trim()
    ) {
      missing.push(
        "email",
      )
    }

    if (
      !address.address1.trim()
    ) {
      missing.push(
        "street address",
      )
    }

    if (
      !address.city.trim()
    ) {
      missing.push(
        "city",
      )
    }

    if (
      !address.state.trim()
    ) {
      missing.push(
        "state",
      )
    }

    if (
      !address.postalCode.trim()
    ) {
      missing.push(
        "ZIP code",
      )
    }

    if (
      !address.country.trim()
    ) {
      missing.push(
        "country",
      )
    }

    return missing
  }

  async function getShippingRates() {
    if (
      !validation
    ) {
      setRateError(
        "Your cart has not finished validating yet.",
      )

      return
    }

    /*
     * Check every required form value individually.
     *
     * If this fails again, the UI will now tell us
     * exactly which field React believes is empty.
     */
    const missingAddressFields =
      getMissingAddressFields()

    if (
      missingAddressFields.length
    ) {
      console.log(
        "Checkout address state:",
        address,
      )

      setRateError(
        `Missing shipping information: ${missingAddressFields.join(", ")}.`,
      )

      return
    }

    if (
      validation.shippingRequired &&
      validation.totalWeightOz <=
        0
    ) {
      setRateError(
        "One or more products do not have a shipping weight configured.",
      )

      return
    }

    setLoadingRates(
      true,
    )

    setRateError(
      "",
    )

    setRates(
      [],
    )

    setSelectedRateId(
      "",
    )

    try {
      /*
       * This shape intentionally matches:
       *
       * app/api/shipping/rates/route.ts
       *
       * {
       *   destination,
       *   totalWeightOz
       * }
       */
      const shippingRequest = {
        destination: {
          name:
            `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),

          line1:
            address.address1.trim(),

          line2:
            address.address2.trim(),

          city:
            address.city.trim(),

          state:
            address.state
              .trim()
              .toUpperCase(),

          postalCode:
            address.postalCode.trim(),

          country:
            address.country
              .trim()
              .toUpperCase(),

          phone:
            address.phone.trim(),

          /*
           * This was missing from the previous
           * checkout request.
           */
          email:
            address.email.trim(),
        },

        totalWeightOz:
          validation.totalWeightOz,

        /*
         * For now use the validated subtotal as
         * the shipment declared value.
         *
         * This is better than hardcoding $1.
         */
        declaredValue:
          validation.subtotal,
      }

      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.log(
          "Checkout shipping request:",
          shippingRequest,
        )
      }

      const response =
        await fetch(
          "/api/shipping/rates",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify(
                shippingRequest,
              ),
          },
        )

      const data =
        await readApiResponse<
          {
            rates?: ShippingRate[]

            meta?: {
              requestId?:
                string | null

              count?: number

              weightOz?: number

              weightKg?: number
            }
          } &
            ApiErrorResponse
        >(
          response,
          "Shipping API",
        )

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            `Unable to calculate shipping (${response.status})`,
        )
      }

      const receivedRates =
        Array.isArray(
          data.rates,
        )
          ? data.rates
          : []

      console.log(
        "Checkout received shipping rates:",
        receivedRates,
      )

      setRates(
        receivedRates,
      )

      if (
        receivedRates.length >
        0
      ) {
        setSelectedRateId(
          receivedRates[0]
            .id,
        )
      } else {
        setRateError(
          "No shipping services were returned for this address.",
        )
      }
    } catch (
      error
    ) {
      console.error(
        "Shipping rate request failed:",
        error,
      )

      setRateError(
        error instanceof
          Error
          ? error.message
          : "Unable to calculate shipping",
      )
    } finally {
      setLoadingRates(
        false,
      )
    }
  }

  function continueToPayment() {
    setPaymentError("")

    if (!validation) {
      setPaymentError("Your cart has not finished validating.")
      return
    }

    const missing = getMissingAddressFields()

    if (missing.length) {
      setPaymentError(
        `Missing shipping information: ${missing.join(", ")}.`,
      )
      return
    }

    if (validation.shippingRequired && !selectedRate) {
      setPaymentError("Select a shipping method before continuing.")
      return
    }

    setPaymentStep("payment")
  }

  async function createCashAppOrder() {
    if (!validation || creatingOrder) return
    if (!checkoutKey) {
  setPaymentError(
    "Checkout is still initializing. Please try again.",
  )
  return
}

    if (validation.shippingRequired && !selectedRate) {
      setPaymentError("Select a shipping method before placing your order.")
      return
    }

    setCreatingOrder(true)
    setPaymentError("")

    try {
      const normalizedRate = selectedRate
        ? {
            id: selectedRate.id,
            rateId: selectedRate.id,
            amount: Number(selectedRate.amount ?? selectedRate.price ?? 0),
            service: selectedRate.service ?? selectedRate.serviceName ?? "Shipping",
            courier: selectedRate.courier ?? selectedRate.courierName ?? "",
          }
        : null

      const response = await fetch("/api/store/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            purchaseType: item.purchaseType,
            quantity: item.quantity,
          })),
          address,
          shippingRate: normalizedRate,
          checkoutKey,
          paymentMethod: "cashapp",
        }),
      })

      const data = await readApiResponse<CreateOrderResponse>(
        response,
        "Create order",
      )

      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Unable to create order.")
      }

      setCreatedOrder(data.order)

      const paymentResponse = await fetch(
        `/api/store/orders/${encodeURIComponent(data.order.id)}/cashapp`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      )

      const paymentData = await readApiResponse<CashAppDetailsResponse>(
        paymentResponse,
        "Cash App payment",
      )

      if (!paymentResponse.ok || !paymentData.cashApp) {
        throw new Error(
          paymentData.error ?? "Unable to load Cash App payment information.",
        )
      }

      setCashAppDetails(paymentData.cashApp)
      setPaymentStep("cashapp")
    } catch (error) {
      console.error("Cash App checkout error:", error)
      setPaymentError(
        error instanceof Error ? error.message : "Unable to create order.",
      )
    } finally {
      setCreatingOrder(false)
    }
  }

  async function copyPaymentValue(
    value: string,
    field: "cashtag" | "amount" | "note",
  ) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(field)
      window.setTimeout(() => setCopied(null), 1500)
    } catch (error) {
      console.error("Unable to copy payment value:", error)
    }
  }

  async function confirmCashAppSent() {
    if (!createdOrder || submittingPayment) return

    setSubmittingPayment(true)
    setPaymentError("")

    try {
      const response = await fetch(
        `/api/store/orders/${encodeURIComponent(createdOrder.id)}/cashapp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({}),
        },
      )

      const data = await readApiResponse<CashAppSubmissionResponse>(
        response,
        "Cash App confirmation",
      )

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ?? "Unable to submit payment confirmation.",
        )
      }

      clearCart()
      setPaymentStep("submitted")
    } catch (error) {
      console.error("Cash App confirmation error:", error)
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Unable to submit payment confirmation.",
      )
    } finally {
      setSubmittingPayment(false)
    }
  }

  /*
   * Wait for localStorage cart hydration.
   */
  if (
    !hydrated
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    )
  }

  /*
   * Empty cart.
   */
  if (
    !items.length
  ) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4">
        <div className="w-full rounded-3xl border bg-card p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />

          <h1 className="mt-4 text-2xl font-black">
            Your cart is empty
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Add something from the store before checking out.
          </p>

          <Button
            asChild
            className="mt-6"
          >
            <Link href="/store">
              Return to Store
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Button
        asChild
        variant="ghost"
        className="-ml-3 mb-5"
      >
        <Link href="/cart">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">
          Secure Checkout
        </p>

        <h1 className="mt-1 text-3xl font-black">
          Shipping
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Enter your shipping address to see live delivery rates.
        </p>
      </div>

      {/* VALIDATION ERROR */}

      {validationError && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="font-bold text-red-500">
            We couldn't validate your cart.
          </p>

          <p className="mt-2 break-words text-sm text-red-500">
            {validationError}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
            >
              <Link href="/cart">
                Back to Cart
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          {/* SHIPPING ADDRESS */}

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-rose-500/10 p-2">
                <MapPin className="h-5 w-5 text-rose-500" />
              </div>

              <div>
                <h2 className="font-black">
                  Shipping Address
                </h2>

                <p className="text-xs text-muted-foreground">
                  Where should we send your order?
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="First name"
                autoComplete="given-name"
                value={
                  address.firstName
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "firstName",
                    event.target
                      .value,
                  )
                }
              />

              <Input
                placeholder="Last name"
                autoComplete="family-name"
                value={
                  address.lastName
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "lastName",
                    event.target
                      .value,
                  )
                }
              />

              <Input
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={
                  address.email
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "email",
                    event.target
                      .value,
                  )
                }
              />

              <Input
                type="tel"
                placeholder="Phone (optional)"
                autoComplete="tel"
                value={
                  address.phone
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "phone",
                    event.target
                      .value,
                  )
                }
              />

              <div className="sm:col-span-2">
                <Input
                  placeholder="Street address"
                  autoComplete="address-line1"
                  value={
                    address.address1
                  }
                  onChange={(
                    event,
                  ) =>
                    updateAddress(
                      "address1",
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  placeholder="Apartment, suite, unit (optional)"
                  autoComplete="address-line2"
                  value={
                    address.address2
                  }
                  onChange={(
                    event,
                  ) =>
                    updateAddress(
                      "address2",
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              <Input
                placeholder="City"
                autoComplete="address-level2"
                value={
                  address.city
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "city",
                    event.target
                      .value,
                  )
                }
              />

              <Input
                placeholder="State (ex. NY)"
                autoComplete="address-level1"
                value={
                  address.state
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "state",
                    event.target.value.toUpperCase(),
                  )
                }
                maxLength={2}
              />

              <Input
                placeholder="ZIP code"
                autoComplete="postal-code"
                value={
                  address.postalCode
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "postalCode",
                    event.target
                      .value,
                  )
                }
              />

              <select
                value={
                  address.country
                }
                onChange={(
                  event,
                ) =>
                  updateAddress(
                    "country",
                    event.target
                      .value,
                  )
                }
                autoComplete="country"
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="US">
                  United States
                </option>
              </select>
            </div>
          </section>

          {/* SHIPPING METHOD */}

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-500/10 p-2">
                  <Truck className="h-5 w-5 text-rose-500" />
                </div>

                <div>
                  <h2 className="font-black">
                    Delivery
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    Live rates powered by Easyship
                  </p>
                </div>
              </div>
            </div>

            {validating && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />

                Checking your cart...
              </div>
            )}

            <Button
              type="button"
              onClick={
                getShippingRates
              }
              disabled={
                loadingRates ||
                validating ||
                !validation ||
                Boolean(
                  validationError,
                )
              }
              className="w-full sm:w-auto"
            >
              {loadingRates ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                  Getting Rates...
                </>
              ) : rates.length ? (
                "Refresh Shipping Rates"
              ) : (
                "Get Shipping Rates"
              )}
            </Button>

            {!validation &&
              !validating &&
              !validationError && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Waiting for cart validation...
                </p>
              )}

            {rateError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="break-words text-sm font-medium text-red-500">
                  {rateError}
                </p>
              </div>
            )}

            {rates.length >
              0 && (
              <div className="mt-5 space-y-3">
                {rates.map(
                  (
                    rate,
                  ) => {
                    const selected =
                      selectedRateId ===
                      rate.id

                    const serviceName =
                      rate.service ??
                      rate.serviceName ??
                      "Shipping"

                    const courierName =
                      rate.courier ??
                      rate.courierName ??
                      ""

                    const logoUrl =
                      rate.logo ??
                      rate.logoUrl ??
                      null

                    const price =
                      Number(
                        rate.amount ??
                          rate.price ??
                          0,
                      )

                    return (
                      <button
                        key={
                          rate.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedRateId(
                            rate.id,
                          )
                        }
                        className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500"
                            : "hover:border-rose-500/40"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-rose-500 bg-rose-500 text-white"
                              : ""
                          }`}
                        >
                          {selected && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>

                        {logoUrl && (
                          <img
                            src={
                              logoUrl
                            }
                            alt=""
                            className="h-8 w-12 object-contain"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-bold">
                            {
                              serviceName
                            }
                          </p>

                          {courierName && (
                            <p className="text-xs text-muted-foreground">
                              {
                                courierName
                              }
                            </p>
                          )}

                          {rate.minDeliveryDays !==
                            null && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {rate.minDeliveryDays ===
                              rate.maxDeliveryDays
                                ? `${rate.minDeliveryDays} business days`
                                : `${rate.minDeliveryDays}–${rate.maxDeliveryDays ?? rate.minDeliveryDays} business days`}
                            </p>
                          )}

                          {rate.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                rate.description
                              }
                            </p>
                          )}
                        </div>

                        <p className="font-black">
                          {money(
                            price,
                          )}
                        </p>
                      </button>
                    )
                  },
                )}
              </div>
            )}
          </section>
        </div>

        {/* ORDER SUMMARY */}

        <aside>
          <div className="sticky top-6 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-black">
              Order Summary
            </h2>

            {validating && (
              <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />

                Checking prices and stock...
              </div>
            )}

            {validationError && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                Cart validation failed.
              </div>
            )}

            {validation && (
              <>
                <div className="mt-5 max-h-[360px] space-y-4 overflow-auto">
                  {validation.items.map(
                    (
                      item,
                    ) => (
                      <div
                        key={`${item.productId}:${item.variantId ?? "base"}:${item.purchaseType}`}
                        className="flex gap-3"
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
                          {item.imageUrl ? (
                            <img
                              src={
                                item.imageUrl
                              }
                              alt={
                                item.name
                              }
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold">
                            {
                              item.name
                            }
                          </p>

                          {item.variantName && (
                            <p className="text-xs text-muted-foreground">
                              {
                                item.variantName
                              }
                            </p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            {item.purchaseType ===
                            "case"
                              ? "Case"
                              : "Single"}{" "}
                            ×{" "}
                            {
                              item.quantity
                            }
                          </p>

                          {item.isPreorder && (
                            <p className="mt-1 text-xs font-bold text-amber-500">
                              Preorder
                              {item.releaseDate
                                ? ` · ${item.releaseDate}`
                                : ""}
                            </p>
                          )}
                        </div>

                        <p className="text-sm font-bold">
                          {money(
                            item.lineTotal,
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                <div className="mt-6 space-y-3 border-t pt-5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal
                    </span>

                    <span className="font-bold">
                      {money(
                        subtotal,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Shipping
                    </span>

                    <span className="font-bold">
                      {selectedRate
                        ? money(
                            shipping,
                          )
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between border-t pt-4 text-lg">
                    <span className="font-black">
                      Total
                    </span>

                    <span className="font-black">
                      {money(
                        total,
                      )}
                    </span>
                  </div>
                </div>

                {paymentError && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm font-medium text-red-500">
                      {paymentError}
                    </p>
                  </div>
                )}

                {paymentStep === "shipping" && (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      onClick={continueToPayment}
                      disabled={
                        Boolean(validationError) ||
                        validating ||
                        (validation.shippingRequired && !selectedRate)
                      }
                      className="mt-6 h-12 w-full bg-rose-600 font-black text-white hover:bg-rose-500"
                    >
                      Continue to Payment
                    </Button>

                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Review your payment method before placing the order.
                    </p>
                  </>
                )}

                {paymentStep === "payment" && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border-2 border-rose-500 bg-rose-500/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-rose-500/10 p-2">
                          <WalletCards className="h-5 w-5 text-rose-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black">Cash App</p>
                          <p className="text-xs text-muted-foreground">
                            Pay securely using Cash App.
                          </p>
                        </div>
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="lg"
                      onClick={createCashAppOrder}
                      disabled={creatingOrder}
                      className="h-12 w-full bg-rose-600 font-black text-white hover:bg-rose-500"
                    >
                      {creatingOrder ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Order...
                        </>
                      ) : (
                        `Place Order · ${money(total)}`
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setPaymentError("")
                        setPaymentStep("shipping")
                      }}
                      disabled={creatingOrder}
                      className="w-full"
                    >
                      Back to Shipping
                    </Button>
                  </div>
                )}

                {paymentStep === "cashapp" && createdOrder && cashAppDetails && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
                      <div className="flex items-center gap-3">
                        <WalletCards className="h-6 w-6 text-rose-500" />
                        <div>
                          <p className="font-black">Pay with Cash App</p>
                          <p className="text-xs text-muted-foreground">
                            Order {createdOrder.order_number}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="rounded-xl border bg-background p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Send To
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p className="break-all text-lg font-black">
                              {cashAppDetails.payTo}
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={() => copyPaymentValue(cashAppDetails.payTo, "cashtag")}>
                              {copied === "cashtag" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-xl border bg-background p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Exact Amount
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p className="text-2xl font-black">
                              {money(cashAppDetails.amount)}
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={() => copyPaymentValue(cashAppDetails.amount.toFixed(2), "amount")}>
                              {copied === "amount" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-xl border bg-background p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Payment Note
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p className="font-black">{cashAppDetails.note}</p>
                            <Button type="button" size="sm" variant="outline" onClick={() => copyPaymentValue(cashAppDetails.note, "note")}>
                              {copied === "note" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        Send the exact amount to the Cash App account above and include your order number as the payment note. Then return here and confirm that payment was sent.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="lg"
                      onClick={confirmCashAppSent}
                      disabled={submittingPayment}
                      className="h-12 w-full bg-rose-600 font-black text-white hover:bg-rose-500"
                    >
                      {submittingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "I've Sent Payment"
                      )}
                    </Button>
                  </div>
                )}

                {paymentStep === "submitted" && createdOrder && (
                  <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                    <h3 className="mt-3 text-lg font-black">Payment Submitted</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Order <strong>{createdOrder.order_number}</strong> is waiting for payment verification.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Your order will remain payment pending until the Cash App payment is confirmed.
                    </p>
                    <Button asChild className="mt-5 w-full" variant="outline">
                      <Link href={`/orders/${createdOrder.id}`}>
                        View Order
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    Prices and inventory are verified directly against the store before checkout.
                  </span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}