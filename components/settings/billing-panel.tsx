"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CreditCard,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  ShieldCheck,
  FileText,
  Download,
  Copy,
  Crown,
  BadgeDollarSign,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { useEntitlements } from "@/hooks/use-entitlements"

import {
  BASIC_MONTHLY_PRICE_USD,
  PREMIUM_MONTHLY_PRICE_USD,
  CASHAPP_CASHTAG,
  CASHAPP_TAG_DISPLAY,
  BILLING_EMAIL,
  TRIAL_DAYS,
  type SubscriptionTier,
} from "@/lib/entitlements"

interface Payment {
  id: string
  invoice_number: string
  amount: number
  currency: string
  method: string
  status: "pending" | "confirmed" | "rejected"
  plan?: SubscriptionTier | null
  cashtag: string
  note: string
  period_start: string
  period_end: string
  created_at: string
  confirmed_at: string | null
}

function formatDate(iso: string): string {
  const date = new Date(iso)

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

function statusBadge(status: Payment["status"]) {
  if (status === "confirmed") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        Confirmed
      </Badge>
    )
  }

  if (status === "rejected") {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  )
}

function getPaymentPlanLabel(payment: Payment) {
  return payment.plan === "basic" ? "Basic" : "Premium"
}

function openInvoice(payment: Payment, email: string | null) {
  const planName = getPaymentPlanLabel(payment)

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${payment.invoice_number}</title>

        <style>
          body {
            font-family: ui-sans-serif, system-ui, sans-serif;
            color: #111;
            max-width: 640px;
            margin: 40px auto;
            padding: 0 24px;
          }

          h1 {
            font-size: 22px;
            margin-bottom: 0;
          }

          .muted {
            color: #666;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
          }

          td,
          th {
            text-align: left;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }

          .total {
            font-size: 20px;
            font-weight: 700;
          }

          .brand {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
        </style>
      </head>

      <body>
        <div class="brand">
          <div>
            <h1>Card Vault</h1>
            <div class="muted">
              Pokémon card inventory management
            </div>
          </div>

          <div style="text-align:right">
            <strong>Invoice</strong><br />
            ${payment.invoice_number}
          </div>
        </div>

        <p class="muted">
          Billed to: ${email ?? ""}<br />
          Issued: ${formatDate(payment.created_at)}<br />
          Status: ${payment.status.toUpperCase()}
        </p>

        <table>
          <tr>
            <th>Description</th>
            <th style="text-align:right">Amount</th>
          </tr>

          <tr>
            <td>
              Card Vault ${planName} subscription
              <br />

              <span class="muted">
                ${formatDate(payment.period_start)}
                –
                ${formatDate(payment.period_end)}
              </span>
            </td>

            <td style="text-align:right">
              $${Number(payment.amount).toFixed(2)}
            </td>
          </tr>

          <tr>
            <td class="total">
              Total
            </td>

            <td class="total" style="text-align:right">
              $${Number(payment.amount).toFixed(2)}
              ${payment.currency}
            </td>
          </tr>
        </table>

        <p class="muted" style="margin-top:28px">
          Paid via CashApp to ${CASHAPP_TAG_DISPLAY}.
          Questions? ${BILLING_EMAIL}
        </p>

        <script>
          window.onload = function () {
            window.print()
          }
        </script>
      </body>
    </html>
  `

  const popup = window.open("", "_blank")

  if (popup) {
    popup.document.write(html)
    popup.document.close()
  } else {
    toast.error("Allow pop-ups to view the invoice")
  }
}

export function BillingPanel() {
  const { entitlements: e, email, loading } = useEntitlements()

  const [payments, setPayments] = useState<Payment[]>([])

  const [loadingPayments, setLoadingPayments] = useState(true)

  const [submitting, setSubmitting] = useState(false)

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>("premium")

  const [cashtag, setCashtag] = useState("")

  const [note, setNote] = useState("")

  const selectedPrice = useMemo(() => {
    return selectedPlan === "basic"
      ? BASIC_MONTHLY_PRICE_USD
      : PREMIUM_MONTHLY_PRICE_USD
  }, [selectedPlan])

  const loadPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/payments")

      if (response.ok) {
        const data = await response.json()

        setPayments(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to load payments:", error)
    } finally {
      setLoadingPayments(false)
    }
  }, [])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  useEffect(() => {
    if (e.plan === "basic") {
      setSelectedPlan("premium")
    }
  }, [e.plan])

  const handleSubmitPayment = async () => {
    setSubmitting(true)

    try {
      const response = await fetch("/api/payments", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          plan: selectedPlan,
          cashtag,
          note,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? "Couldn't record payment")
      }

      toast.success(
        `${selectedPlan === "basic" ? "Basic" : "Premium"} payment recorded`,
        {
          description:
            "We'll confirm it shortly and activate your subscription.",
        },
      )

      setCashtag("")
      setNote("")

      await loadPayments()
    } catch (error) {
      console.error("Payment submission failed:", error)

      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't record your payment. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const confirmed = payments.filter((payment) => payment.status === "confirmed")

  const planLabel: Record<string, string> = {
    admin: "Owner / Admin",
    grandfathered: "Founding member — Premium free forever",
    basic: "Basic",
    premium: "Premium",
    trial: "Premium trial",
    expired: "Trial ended",
  }

  const pendingPayment = payments.find(
    (payment) => payment.status === "pending",
  )

  const canPurchase = e.plan !== "admin" && e.plan !== "grandfathered"

  return (
    <div className="space-y-6">
      {/* CURRENT PLAN */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            <div>
              <CardTitle>Your plan</CardTitle>

              <CardDescription>
                {loading ? "Loading…" : (planLabel[e.plan] ?? "Card Vault")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {e.plan === "grandfathered" && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />

              <AlertTitle>Premium access — free forever</AlertTitle>

              <AlertDescription>
                You&apos;re a founding member. Your account keeps full Premium
                access at no cost.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "admin" && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />

              <AlertTitle>Owner account</AlertTitle>

              <AlertDescription>
                You have unrestricted access to every Card Vault feature.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "basic" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />

              <AlertTitle>Basic subscription active</AlertTitle>

              <AlertDescription>
                Inventory, sets, bulk adding, TCGPlayer pricing and binders are
                unlocked
                {e.paidUntil ? ` through ${formatDate(e.paidUntil)}` : ""}.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "premium" && (
            <Alert>
              <Crown className="h-4 w-4" />

              <AlertTitle>Premium subscription active</AlertTitle>

              <AlertDescription>
                Every Card Vault feature is unlocked
                {e.paidUntil ? ` through ${formatDate(e.paidUntil)}` : ""}.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "trial" && (
            <Alert className="border-primary/40">
              <Clock className="h-4 w-4" />

              <AlertTitle>
                Premium trial — {e.trialDaysLeft ?? 0} day
                {e.trialDaysLeft === 1 ? "" : "s"} remaining
              </AlertTitle>

              <AlertDescription>
                You have full Premium access during your {TRIAL_DAYS}-day trial.
                Choose Basic or Premium anytime to keep using Card Vault after
                your trial ends.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "expired" && (
            <Alert className="border-destructive/50">
              <XCircle className="h-4 w-4" />

              <AlertTitle>Your Premium trial has ended</AlertTitle>

              <AlertDescription>
                Choose Basic for ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}
                /month or Premium for ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
                /month to continue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* PLAN SELECTION */}
      {canPurchase && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BadgeDollarSign className="h-5 w-5 text-primary" />
              </div>

              <div>
                <CardTitle>Choose your plan</CardTitle>

                <CardDescription>
                  Simple early-access pricing. Upgrade to Premium whenever you
                  need the advanced tools.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* BASIC */}
              <Card
                className={
                  selectedPlan === "basic"
                    ? "border-primary shadow-sm ring-1 ring-primary"
                    : ""
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Basic</CardTitle>

                      <CardDescription>
                        Everything you need to manage your collection
                      </CardDescription>
                    </div>

                    {selectedPlan === "basic" && <Badge>Selected</Badge>}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div>
                    <span className="text-4xl font-bold">
                      ${BASIC_MONTHLY_PRICE_USD.toFixed(2)}
                    </span>

                    <span className="text-muted-foreground">/month</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <FeatureItem>Browse Pokémon sets and cards</FeatureItem>

                    <FeatureItem>Full inventory management</FeatureItem>

                    <FeatureItem>Add individual cards</FeatureItem>

                    <FeatureItem>Bulk add cards</FeatureItem>

                    <FeatureItem>TCGPlayer market pricing</FeatureItem>

                    <FeatureItem>Binder organization</FeatureItem>
                  </div>

                  <Button
                    type="button"
                    variant={selectedPlan === "basic" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedPlan("basic")}
                  >
                    {selectedPlan === "basic"
                      ? "Basic Selected"
                      : "Choose Basic"}
                  </Button>
                </CardContent>
              </Card>

              {/* PREMIUM */}
              <Card
                className={
                  selectedPlan === "premium"
                    ? "border-primary shadow-sm ring-1 ring-primary"
                    : ""
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Premium</CardTitle>

                        <Crown className="h-5 w-5 text-primary" />
                      </div>

                      <CardDescription>
                        Full access for serious collectors and sellers
                      </CardDescription>
                    </div>

                    {selectedPlan === "premium" && <Badge>Selected</Badge>}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div>
                    <span className="text-4xl font-bold">
                      ${PREMIUM_MONTHLY_PRICE_USD.toFixed(2)}
                    </span>

                    <span className="text-muted-foreground">/month</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <FeatureItem>Everything in Basic</FeatureItem>

                    <FeatureItem>Full collection analytics</FeatureItem>

                    <FeatureItem>Public Showcase</FeatureItem>

                    <FeatureItem>Customer Lists</FeatureItem>

                    <FeatureItem>Collection import</FeatureItem>

                    <FeatureItem>Card scanning</FeatureItem>

                    <FeatureItem>Advanced seller tools</FeatureItem>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    variant={selectedPlan === "premium" ? "default" : "outline"}
                    onClick={() => setSelectedPlan("premium")}
                  >
                    {selectedPlan === "premium"
                      ? "Premium Selected"
                      : "Choose Premium"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CASHAPP PAYMENT */}
      {canPurchase && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>

              <div>
                <CardTitle>Pay with CashApp</CardTitle>

                <CardDescription>
                  {selectedPlan === "basic"
                    ? `Basic — $${BASIC_MONTHLY_PRICE_USD.toFixed(2)}/month`
                    : `Premium — $${PREMIUM_MONTHLY_PRICE_USD.toFixed(
                        2,
                      )}/month`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {pendingPayment && (
              <Alert>
                <Clock className="h-4 w-4" />

                <AlertTitle>Payment pending review</AlertTitle>

                <AlertDescription>
                  You already have a pending{" "}
                  {getPaymentPlanLabel(pendingPayment)} payment for $
                  {Number(pendingPayment.amount).toFixed(2)}.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {selectedPlan === "basic" ? "Basic" : "Premium"}{" "}
                    subscription
                  </p>

                  <p className="text-sm text-muted-foreground">
                    One month of access
                  </p>
                </div>

                <p className="text-3xl font-bold">
                  ${selectedPrice.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </div>
            </div>

            <ol className="list-decimal space-y-3 pl-5 text-sm">
              <li>
                Open CashApp and send{" "}
                <span className="font-semibold">
                  ${selectedPrice.toFixed(2)}
                </span>{" "}
                to{" "}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(CASHAPP_CASHTAG)

                    toast.success("CashApp tag copied")
                  }}
                  className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono font-semibold"
                >
                  {CASHAPP_CASHTAG}

                  <Copy className="h-3 w-3" />
                </button>{" "}
                <span className="text-muted-foreground">
                  ({CASHAPP_TAG_DISPLAY})
                </span>
                .
              </li>

              <li>
                Add your Card Vault account email{" "}
                <strong>{email ?? "—"}</strong> in the CashApp note.
              </li>

              <li>
                Come back here and click <strong>I&apos;ve sent payment</strong>
                .
              </li>

              <li>
                Your payment will appear as pending until it is confirmed.
              </li>
            </ol>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cashtag">
                  Your CashApp $cashtag (optional)
                </Label>

                <Input
                  id="cashtag"
                  placeholder="$yourtag"
                  value={cashtag}
                  onChange={(event) => setCashtag(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Note (optional)</Label>

                <Input
                  id="note"
                  placeholder="Payment reference / message"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleSubmitPayment} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              I&apos;ve sent ${selectedPrice.toFixed(2)} for{" "}
              {selectedPlan === "basic" ? "Basic" : "Premium"}
            </Button>

            <p className="text-xs text-muted-foreground">
              New accounts receive a {TRIAL_DAYS}-day Premium trial. Payments
              are reviewed manually. Questions? {BILLING_EMAIL}
            </p>
          </CardContent>
        </Card>
      )}

      {/* PAYMENT HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>

          <CardDescription>
            Every subscription payment you&apos;ve submitted
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loadingPayments ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {getPaymentPlanLabel(payment)}
                      </p>

                      <Badge variant="outline">
                        ${Number(payment.amount).toFixed(2)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(payment.created_at)} ·{" "}
                      {payment.invoice_number}
                    </p>
                  </div>

                  {statusBadge(payment.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* INVOICES */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>

            <div>
              <CardTitle>Invoices</CardTitle>

              <CardDescription>
                Download receipts for confirmed payments
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {confirmed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Invoices appear here once a payment is confirmed.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {confirmed.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{payment.invoice_number}</p>

                      <Badge variant="outline">
                        {getPaymentPlanLabel(payment)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(payment.period_start)} –{" "}
                      {formatDate(payment.period_end)} · $
                      {Number(payment.amount).toFixed(2)}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInvoice(payment, email)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Invoice
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

      <span>{children}</span>
    </div>
  )
}
