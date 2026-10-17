"use client"

import Link from "next/link"
import {
  useMemo,
  useState,
} from "react"
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Check,
  Clock3,
  FileSpreadsheet,
  Headphones,
  Loader2,
  MapPin,
  Package,
  PlugZap,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  WandSparkles,
} from "lucide-react"
import {
  useRouter,
} from "next/navigation"
import {
  toast,
} from "sonner"

import {
  Badge,
} from "@/components/ui/badge"
import {
  Button,
} from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"

type PlanId =
  | "starter"
  | "pro"
  | "plus"

type BillingInterval =
  | "monthly"
  | "yearly"

type FormState = {
  legalName: string
  dbaName: string
  ein: string

  businessType: string
  businessPhone: string
  businessEmail: string
  website: string

  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  countryCode: string

  yearEstablished: string
  estimatedInventorySize: string
  primarySalesChannel: string
  businessNotes: string

  customPlatformName: string

  ownerName: string
  ownerEmail: string
  password: string
  confirmPassword: string
}

const PLANS = {
  starter: {
    name: "Starter",
    tagline:
      "For independent sellers and small shops.",

    monthly: 9.99,
    yearly: 49.99,

    employees: 1,

    features: [
      "Unlimited inventory",
      "1 employee account",
      "Standard import & export",
      "Standard analytics",
      "Square integration",
      "Email support",
      "Virtual Employee available at $10/hr",
    ],
  },

  pro: {
    name: "Pro",
    tagline:
      "For growing card shops and sellers.",

    monthly: 19.99,
    yearly: 149.99,

    employees: 5,

    popular: true,

    features: [
      "Everything in Starter",
      "5 employee accounts",
      "Advanced import & export",
      "Advanced analytics",
      "Up to 3 integrations",
      "Scheduled sync",
      "Chat support",
      "4 Virtual Employee hours included*",
      "Additional Virtual Employee work at $8/hr",
    ],
  },

  plus: {
    name: "Plus",
    tagline:
      "For established stores that need automation.",

    monthly: 29.99,
    yearly: 199.99,

    employees: 10,

    features: [
      "Everything in Pro",
      "10 employee accounts",
      "Advanced import/export automation",
      "Unlimited supported integrations",
      "Multi-location tools",
      "Advanced permissions",
      "Dedicated Account Specialist",
      "12 Virtual Employee hours included*",
      "Additional Virtual Employee work at $5/hr",
    ],
  },
} as const

const BUSINESS_TYPES = [
  {
    value: "card_shop",
    label: "Card Shop",
  },
  {
    value: "online_seller",
    label: "Online Seller",
  },
  {
    value: "breaker",
    label: "Breaker",
  },
  {
    value:
      "collectibles_store",
    label:
      "Collectibles Store",
  },
  {
    value: "hobby_shop",
    label: "Hobby Shop",
  },
  {
    value: "other",
    label: "Other",
  },
]

const INVENTORY_SIZES = [
  {
    value: "",
    label:
      "Select inventory size",
  },
  {
    value: "under_500",
    label: "Under 500 items",
  },
  {
    value: "500_2500",
    label: "500 – 2,500 items",
  },
  {
    value: "2500_10000",
    label:
      "2,500 – 10,000 items",
  },
  {
    value: "10000_50000",
    label:
      "10,000 – 50,000 items",
  },
  {
    value: "50000_plus",
    label: "50,000+ items",
  },
]

const SALES_CHANNELS = [
  {
    value: "",
    label:
      "Select primary channel",
  },
  {
    value: "retail_store",
    label:
      "Physical Retail Store",
  },
  {
    value: "own_website",
    label: "Own Website",
  },
  {
    value: "tcgplayer",
    label: "TCGplayer",
  },
  {
    value: "ebay",
    label: "eBay",
  },
  {
    value: "whatnot",
    label: "Whatnot",
  },
  {
    value: "marketplaces",
    label:
      "Multiple Marketplaces",
  },
  {
    value: "social_media",
    label: "Social Media",
  },
  {
    value: "events",
    label:
      "Shows / Conventions",
  },
  {
    value: "other",
    label: "Other",
  },
]

const PLATFORMS = [
  ["square", "Square"],
  ["shopify", "Shopify"],
  ["clover", "Clover"],
  ["lightspeed", "Lightspeed"],
  [
    "paypal_zettle",
    "PayPal / Zettle",
  ],
  ["stripe", "Stripe"],
  [
    "woocommerce",
    "WooCommerce",
  ],
  [
    "bigcommerce",
    "BigCommerce",
  ],
  ["tcgplayer", "TCGplayer"],
  ["ebay", "eBay"],
  ["whatnot", "Whatnot"],
  ["amazon", "Amazon"],
  ["other", "Other"],
] as const

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

function annualSavings(
  plan: PlanId,
) {
  const config =
    PLANS[plan]

  return (
    config.monthly * 12 -
    config.yearly
  )
}

function formatEin(
  value: string,
) {
  const digits =
    value
      .replace(/\D/g, "")
      .slice(0, 9)

  if (
    digits.length <= 2
  ) {
    return digits
  }

  return `${digits.slice(
    0,
    2,
  )}-${digits.slice(2)}`
}

export default function BusinessSignupPage() {
  const router =
    useRouter()

  const [
    selectedPlan,
    setSelectedPlan,
  ] =
    useState<PlanId>(
      "pro",
    )

  const [
    billingInterval,
    setBillingInterval,
  ] =
    useState<BillingInterval>(
      "yearly",
    )

  const [
    selectedPlatforms,
    setSelectedPlatforms,
  ] = useState<string[]>([])

  const [
    usesNoPlatform,
    setUsesNoPlatform,
  ] = useState(false)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    form,
    setForm,
  ] = useState<FormState>({
    legalName: "",
    dbaName: "",
    ein: "",

    businessType:
      "card_shop",

    businessPhone: "",
    businessEmail: "",
    website: "",

    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    countryCode: "US",

    yearEstablished: "",
    estimatedInventorySize:
      "",
    primarySalesChannel: "",
    businessNotes: "",

    customPlatformName: "",

    ownerName: "",
    ownerEmail: "",
    password: "",
    confirmPassword: "",
  })

  const selectedConfig =
    PLANS[selectedPlan]

  const selectedPrice =
    selectedConfig[
      billingInterval
    ]

  const otherSelected =
    selectedPlatforms.includes(
      "other",
    )

  const einDigits =
    form.ein.replace(
      /\D/g,
      "",
    )

  const canSubmit =
    useMemo(() => {
      return Boolean(
        form.legalName.trim() &&
          einDigits.length ===
            9 &&
          form.businessPhone.trim() &&
          form.addressLine1.trim() &&
          form.city.trim() &&
          form.state.trim() &&
          form.postalCode.trim() &&
          form.countryCode.trim() &&
          form.ownerName.trim() &&
          form.ownerEmail.trim() &&
          form.password.length >=
            8 &&
          form.password ===
            form.confirmPassword &&
          (
            !otherSelected ||
            form.customPlatformName.trim()
          ),
      )
    }, [
      einDigits,
      form,
      otherSelected,
    ])

  function updateField(
    field: keyof FormState,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    )
  }

  function togglePlatform(
    provider: string,
  ) {
    setUsesNoPlatform(
      false,
    )

    setSelectedPlatforms(
      (current) =>
        current.includes(
          provider,
        )
          ? current.filter(
              (item) =>
                item !==
                provider,
            )
          : [
              ...current,
              provider,
            ],
    )
  }

  function chooseNoPlatform() {
    setUsesNoPlatform(
      true,
    )

    setSelectedPlatforms(
      [],
    )

    updateField(
      "customPlatformName",
      "",
    )
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    if (
      einDigits.length !== 9
    ) {
      toast.error(
        "Enter a valid 9-digit EIN.",
      )

      return
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      toast.error(
        "Passwords do not match.",
      )

      return
    }

    if (
      form.password.length <
      8
    ) {
      toast.error(
        "Password must be at least 8 characters.",
      )

      return
    }

    if (
      otherSelected &&
      !form.customPlatformName.trim()
    ) {
      toast.error(
        "Enter the name of your other sales or POS platform.",
      )

      return
    }

    setLoading(true)

    try {
      const response =
        await fetch(
          "/api/business/register",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                legalName:
                  form.legalName,

                dbaName:
                  form.dbaName,

                ein:
                  form.ein,

                businessType:
                  form.businessType,

                businessPhone:
                  form.businessPhone,

                businessEmail:
                  form.businessEmail,

                website:
                  form.website,

                addressLine1:
                  form.addressLine1,

                addressLine2:
                  form.addressLine2,

                city:
                  form.city,

                state:
                  form.state,

                postalCode:
                  form.postalCode,

                countryCode:
                  form.countryCode,

                yearEstablished:
                  form.yearEstablished,

                estimatedInventorySize:
                  form.estimatedInventorySize,

                primarySalesChannel:
                  form.primarySalesChannel,

                businessNotes:
                  form.businessNotes,

                platforms:
                  usesNoPlatform
                    ? []
                    : selectedPlatforms,

                customPlatformName:
                  otherSelected
                    ? form.customPlatformName
                    : "",

                ownerName:
                  form.ownerName,

                ownerEmail:
                  form.ownerEmail,

                password:
                  form.password,

                plan:
                  selectedPlan,

                billingInterval,
              }),
          },
        )

      const data =
        await response
          .json()
          .catch(
            () => null,
          )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to create business account.",
        )
      }

      toast.success(
        "Your Business account is ready!",
        {
          description:
            "Your 7-day Business Pro trial has started. No credit card required.",
        },
      )

      router.push(
        data?.next ||
          "/login?business=created",
      )

      router.refresh()
    } catch (error) {
      console.error(
        "Business signup:",
        error,
      )

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create business account.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">

        {/* TOP */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <Badge
            variant="outline"
            className="gap-2"
          >
            <Rocket className="h-3.5 w-3.5" />
            Team Rocket Markets
            Business
          </Badge>
        </div>

        {/* HERO */}

        <section className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>

          <Badge className="mb-4">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            7 DAYS FREE
          </Badge>

          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Run your card business
            from one place.
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
            Inventory, employees,
            analytics, imports,
            integrations and business
            tools built for card shops,
            collectibles stores and
            professional sellers.
          </p>

          <p className="mt-3 font-semibold">
            Try Business Pro free for
            7 days. No credit card
            required.
          </p>
        </section>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">

            <div className="space-y-7">

              {/* BUSINESS */}

              <SectionCard
                icon={Store}
                title="Business Information"
                description="Tell us about the business that will own this Team Rocket Markets account."
              >
                <div className="grid gap-5 sm:grid-cols-2">

                  <Field
                    className="sm:col-span-2"
                    label="Legal Business Name"
                    required
                  >
                    <Input
                      required
                      value={
                        form.legalName
                      }
                      placeholder="Rocket City Cards LLC"
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "legalName",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="DBA / Store Name"
                    hint="Optional"
                  >
                    <Input
                      value={
                        form.dbaName
                      }
                      placeholder="Rocket City Cards"
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "dbaName",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Business Type"
                    required
                  >
                    <select
                      required
                      value={
                        form.businessType
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "businessType",
                          event.target
                            .value,
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {BUSINESS_TYPES.map(
                        (type) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Federal Tax ID / EIN"
                    required
                  >
                    <Input
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="12-3456789"
                      value={
                        form.ein
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "ein",
                          formatEin(
                            event.target
                              .value,
                          ),
                        )
                      }
                    />

                    <p className="mt-1 text-xs text-muted-foreground">
                      Stored encrypted.
                      Your full EIN is
                      not exposed in
                      your normal
                      business profile.
                    </p>
                  </Field>

                  <Field
                    label="Business Phone"
                    required
                  >
                    <Input
                      required
                      type="tel"
                      autoComplete="tel"
                      placeholder="(555) 555-1234"
                      value={
                        form.businessPhone
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "businessPhone",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Business Email"
                    hint="Optional"
                  >
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="shop@example.com"
                      value={
                        form.businessEmail
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "businessEmail",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    className="sm:col-span-2"
                    label="Website"
                    hint="Optional"
                  >
                    <Input
                      placeholder="https://yourstore.com"
                      value={
                        form.website
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "website",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* ADDRESS */}

              <SectionCard
                icon={MapPin}
                title="Business Address"
                description="Enter the primary address for your business."
              >
                <div className="grid gap-5 sm:grid-cols-2">

                  <Field
                    className="sm:col-span-2"
                    label="Street Address"
                    required
                  >
                    <Input
                      required
                      autoComplete="street-address"
                      value={
                        form.addressLine1
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "addressLine1",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    className="sm:col-span-2"
                    label="Address Line 2"
                    hint="Optional"
                  >
                    <Input
                      placeholder="Suite, unit, building, etc."
                      value={
                        form.addressLine2
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "addressLine2",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="City"
                    required
                  >
                    <Input
                      required
                      autoComplete="address-level2"
                      value={
                        form.city
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "city",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="State / Province"
                    required
                  >
                    <Input
                      required
                      autoComplete="address-level1"
                      value={
                        form.state
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "state",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="ZIP / Postal Code"
                    required
                  >
                    <Input
                      required
                      autoComplete="postal-code"
                      value={
                        form.postalCode
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "postalCode",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Country"
                    required
                  >
                    <select
                      required
                      value={
                        form.countryCode
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "countryCode",
                          event.target
                            .value,
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="US">
                        United States
                      </option>
                      <option value="CA">
                        Canada
                      </option>
                    </select>
                  </Field>
                </div>
              </SectionCard>

              {/* PROFILE */}

              <SectionCard
                icon={BarChart3}
                title="Business Profile"
                description="Optional information that helps us tailor imports, integrations and onboarding."
              >
                <div className="grid gap-5 sm:grid-cols-2">

                  <Field
                    label="Year Established"
                    hint="Optional"
                  >
                    <Input
                      type="number"
                      min="1800"
                      max={
                        new Date()
                          .getFullYear()
                      }
                      placeholder="2024"
                      value={
                        form.yearEstablished
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "yearEstablished",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Estimated Inventory"
                    hint="Optional"
                  >
                    <select
                      value={
                        form.estimatedInventorySize
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "estimatedInventorySize",
                          event.target
                            .value,
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {INVENTORY_SIZES.map(
                        (item) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    className="sm:col-span-2"
                    label="Primary Sales Channel"
                    hint="Optional"
                  >
                    <select
                      value={
                        form.primarySalesChannel
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "primarySalesChannel",
                          event.target
                            .value,
                        )
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {SALES_CHANNELS.map(
                        (item) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </Field>

                  <Field
                    className="sm:col-span-2"
                    label="Tell us about your business"
                    hint="Optional"
                  >
                    <textarea
                      rows={4}
                      value={
                        form.businessNotes
                      }
                      placeholder="Anything you'd like us to know about your inventory, workflow, store or goals..."
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "businessNotes",
                          event.target
                            .value,
                        )
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* PLATFORMS */}

              <SectionCard
                icon={PlugZap}
                title="Sales & POS Platforms"
                description="Which systems does your business currently use? Select all that apply."
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PLATFORMS.map(
                    ([
                      id,
                      label,
                    ]) => {
                      const selected =
                        selectedPlatforms.includes(
                          id,
                        )

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            togglePlatform(
                              id,
                            )
                          }
                          className={[
                            "flex min-h-12 items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-muted/50",
                          ].join(
                            " ",
                          )}
                        >
                          {label}

                          {selected && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      )
                    },
                  )}

                  <button
                    type="button"
                    onClick={
                      chooseNoPlatform
                    }
                    className={[
                      "flex min-h-12 items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                      usesNoPlatform
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50",
                    ].join(
                      " ",
                    )}
                  >
                    None currently

                    {usesNoPlatform && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {otherSelected && (
                  <div className="mt-5">
                    <Field
                      label="Other Platform Name"
                      required
                    >
                      <Input
                        required
                        placeholder="Crystal Commerce, BinderPOS, etc."
                        value={
                          form.customPlatformName
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "customPlatformName",
                            event.target
                              .value,
                          )
                        }
                      />
                    </Field>
                  </div>
                )}

                <p className="mt-4 text-xs text-muted-foreground">
                  This does not connect
                  your accounts or ask
                  for API credentials.
                  We'll configure
                  supported integrations
                  securely after signup.
                </p>
              </SectionCard>

              {/* OWNER */}

              <SectionCard
                icon={ShieldCheck}
                title="Business Owner"
                description="This becomes the Owner account with control over staff, billing and business settings."
              >
                <div className="grid gap-5 sm:grid-cols-2">

                  <Field
                    className="sm:col-span-2"
                    label="Owner Name"
                    required
                  >
                    <Input
                      required
                      autoComplete="name"
                      value={
                        form.ownerName
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "ownerName",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    className="sm:col-span-2"
                    label="Owner Email"
                    required
                  >
                    <Input
                      required
                      type="email"
                      autoComplete="email"
                      value={
                        form.ownerEmail
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "ownerEmail",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Password"
                    required
                  >
                    <Input
                      required
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={
                        form.password
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "password",
                          event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Confirm Password"
                    required
                  >
                    <Input
                      required
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      value={
                        form.confirmPassword
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "confirmPassword",
                          event.target
                            .value,
                        )
                      }
                    />

                    {form.confirmPassword &&
                      form.password !==
                        form.confirmPassword && (
                        <p className="mt-1 text-xs text-destructive">
                          Passwords do
                          not match.
                        </p>
                      )}
                  </Field>
                </div>
              </SectionCard>

              {/* PLAN SELECTOR MOBILE/DESKTOP */}

              <SectionCard
                icon={Rocket}
                title="Choose Your Plan"
                description="Your selected plan begins after your free 7-day Business Pro trial."
              >
                <div className="mb-6 flex justify-center">
                  <div className="inline-flex rounded-xl border bg-muted/30 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setBillingInterval(
                          "monthly",
                        )
                      }
                      className={[
                        "rounded-lg px-5 py-2 text-sm font-semibold transition",
                        billingInterval ===
                        "monthly"
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground",
                      ].join(
                        " ",
                      )}
                    >
                      Monthly
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setBillingInterval(
                          "yearly",
                        )
                      }
                      className={[
                        "rounded-lg px-5 py-2 text-sm font-semibold transition",
                        billingInterval ===
                        "yearly"
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground",
                      ].join(
                        " ",
                      )}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {(
                    Object.keys(
                      PLANS,
                    ) as PlanId[]
                  ).map(
                    (planId) => (
                      <PlanCard
                        key={
                          planId
                        }
                        planId={
                          planId
                        }
                        selected={
                          selectedPlan ===
                          planId
                        }
                        billingInterval={
                          billingInterval
                        }
                        onSelect={() =>
                          setSelectedPlan(
                            planId,
                          )
                        }
                      />
                    ),
                  )}
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  * Virtual Employee
                  included hours begin
                  with a paid
                  subscription and are
                  not included during
                  the free trial.
                </p>
              </SectionCard>
            </div>

            {/* SUMMARY */}

            <aside>
              <Card className="xl:sticky xl:top-24">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge>
                      7-DAY PRO TRIAL
                    </Badge>

                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>

                  <CardTitle className="pt-2 text-2xl">
                    Start free today
                  </CardTitle>

                  <CardDescription>
                    No credit card
                    required. Your
                    selected paid plan
                    begins only after
                    activation.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selected plan
                    </p>

                    <p className="mt-1 text-xl font-black">
                      Business{" "}
                      {
                        selectedConfig.name
                      }
                    </p>

                    <div className="mt-3">
                      <span className="text-3xl font-black">
                        {money(
                          selectedPrice,
                        )}
                      </span>

                      <span className="text-sm text-muted-foreground">
                        /
                        {billingInterval ===
                        "monthly"
                          ? "month"
                          : "year"}
                      </span>
                    </div>

                    {billingInterval ===
                      "yearly" && (
                      <p className="mt-2 text-sm font-semibold text-emerald-600">
                        Save{" "}
                        {money(
                          annualSavings(
                            selectedPlan,
                          ),
                        )}{" "}
                        per year
                      </p>
                    )}
                  </div>

                  <div className="my-5 space-y-3">
                    <SummaryFeature
                      icon={
                        Clock3
                      }
                      text="7 days of Pro access"
                    />

                    <SummaryFeature
                      icon={
                        Package
                      }
                      text="Unlimited inventory"
                    />

                    <SummaryFeature
                      icon={
                        Users
                      }
                      text="5 employee seats during trial"
                    />

                    <SummaryFeature
                      icon={
                        FileSpreadsheet
                      }
                      text="Advanced import & export"
                    />

                    <SummaryFeature
                      icon={
                        PlugZap
                      }
                      text="Up to 3 integrations during trial"
                    />

                    <SummaryFeature
                      icon={
                        Headphones
                      }
                      text="Chat support during trial"
                    />

                    <SummaryFeature
                      icon={
                        WandSparkles
                      }
                      text="No credit card required"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={
                      loading ||
                      !canSubmit
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating
                        Business...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Start My 7-Day
                        Trial
                      </>
                    )}
                  </Button>

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    You will not be
                    charged when
                    creating your
                    account.
                  </p>

                  <div className="my-5 border-t" />

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an
                    account?{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-foreground underline underline-offset-4"
                    >
                      Sign in
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`space-y-2 ${className}`}
    >
      <Label>
        {label}

        {required && (
          <span className="ml-1 text-destructive">
            *
          </span>
        )}

        {hint && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </Label>

      {children}
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Store
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <CardTitle>
              {title}
            </CardTitle>

            <CardDescription className="mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

function PlanCard({
  planId,
  selected,
  billingInterval,
  onSelect,
}: {
  planId: PlanId
  selected: boolean
  billingInterval: BillingInterval
  onSelect: () => void
}) {
  const plan =
    PLANS[planId]

  const price =
    plan[billingInterval]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "relative rounded-2xl border p-5 text-left transition",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50",
      ].join(" ")}
    >
      {"popular" in plan &&
        plan.popular && (
          <Badge className="absolute -top-3 left-4">
            Most Popular
          </Badge>
        )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-black">
            {plan.name}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {plan.tagline}
          </p>
        </div>

        <div
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40",
          ].join(" ")}
        >
          {selected && (
            <Check className="h-3 w-3" />
          )}
        </div>
      </div>

      <div className="mt-4">
        <span className="text-3xl font-black">
          {money(price)}
        </span>

        <span className="text-xs text-muted-foreground">
          /
          {billingInterval ===
          "monthly"
            ? "mo"
            : "yr"}
        </span>
      </div>

      {billingInterval ===
        "yearly" && (
        <p className="mt-1 text-xs font-semibold text-emerald-600">
          Save{" "}
          {money(
            annualSavings(
              planId,
            ),
          )}
          /year
        </p>
      )}

      <div className="mt-5 space-y-2">
        {plan.features.map(
          (feature) => (
            <div
              key={feature}
              className="flex items-start gap-2 text-xs"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />

              <span>
                {feature}
              </span>
            </div>
          ),
        )}
      </div>
    </button>
  )
}

function SummaryFeature({
  icon: Icon,
  text,
}: {
  icon: typeof Package
  text: string
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <span>{text}</span>
    </div>
  )
}
