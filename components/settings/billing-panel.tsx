"use client"

import { useCallback, useEffect, useState } from "react"
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
  MONTHLY_PRICE_USD,
  CASHAPP_CASHTAG,
  CASHAPP_TAG_DISPLAY,
  BILLING_EMAIL,
  TRIAL_DAYS,
} from "@/lib/entitlements"

interface Payment {
  id: string
  invoice_number: string
  amount: number
  currency: string
  method: string
  status: "pending" | "confirmed" | "rejected"
  cashtag: string
  note: string
  period_start: string
  period_end: string
  created_at: string
  confirmed_at: string | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

function statusBadge(status: Payment["status"]) {
  if (status === "confirmed")
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle className="mr-1 h-3 w-3" /> Confirmed
      </Badge>
    )
  if (status === "rejected")
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" /> Rejected
      </Badge>
    )
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" /> Pending
    </Badge>
  )
}

// Opens a clean, printable invoice in a new tab.
function openInvoice(p: Payment, email: string | null) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Invoice ${p.invoice_number}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;max-width:640px;margin:40px auto;padding:0 24px}
    h1{font-size:22px;margin-bottom:0} .muted{color:#666}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    td,th{text-align:left;padding:10px 0;border-bottom:1px solid #eee}
    .total{font-size:20px;font-weight:700}
    .brand{display:flex;justify-content:space-between;align-items:flex-start}
  </style></head><body>
    <div class="brand">
      <div><h1>Card Vault</h1><div class="muted">Pokémon card inventory management</div></div>
      <div style="text-align:right"><strong>Invoice</strong><br/>${p.invoice_number}</div>
    </div>
    <p class="muted">Billed to: ${email ?? ""}<br/>
      Issued: ${formatDate(p.created_at)}<br/>
      Status: ${p.status.toUpperCase()}</p>
    <table>
      <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
      <tr><td>Card Vault subscription<br/><span class="muted">${formatDate(p.period_start)} – ${formatDate(p.period_end)}</span></td>
          <td style="text-align:right">$${Number(p.amount).toFixed(2)}</td></tr>
      <tr><td class="total">Total</td><td class="total" style="text-align:right">$${Number(p.amount).toFixed(2)} ${p.currency}</td></tr>
    </table>
    <p class="muted" style="margin-top:28px">Paid via CashApp to ${CASHAPP_TAG_DISPLAY}. Questions? ${BILLING_EMAIL}</p>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
  const w = window.open("", "_blank")
  if (w) {
    w.document.write(html)
    w.document.close()
  } else {
    toast.error("Allow pop-ups to view the invoice")
  }
}

export function BillingPanel() {
  const { entitlements: e, email, loading } = useEntitlements()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cashtag, setCashtag] = useState("")
  const [note, setNote] = useState("")

  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments")
      if (res.ok) setPayments(await res.json())
    } catch {
      // ignore — panel still renders
    } finally {
      setLoadingPayments(false)
    }
  }, [])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const handleSubmitPayment = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashtag, note }),
      })
      if (!res.ok) throw new Error()
      toast.success(
        "Payment recorded — we'll confirm it shortly and unlock full access.",
      )
      setCashtag("")
      setNote("")
      await loadPayments()
    } catch {
      toast.error("Couldn't record your payment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const confirmed = payments.filter((p) => p.status === "confirmed")

  const planLabel: Record<string, string> = {
    admin: "Owner / Admin",
    grandfathered: "Founding member — free forever",
    paid: "Active subscription",
    trial: "Free trial",
    expired: "Trial ended",
  }

  return (
    <div className="space-y-6">
      {/* Plan status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Your plan</CardTitle>
              <CardDescription>
                {loading ? "Loading…" : planLabel[e.plan] ?? "Card Vault"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {e.plan === "grandfathered" && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>You have full access, free — forever</AlertTitle>
              <AlertDescription>
                As an existing member your account keeps every feature at no
                cost. There&apos;s nothing to pay.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "admin" && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Owner account</AlertTitle>
              <AlertDescription>
                You have unrestricted access to every feature.
              </AlertDescription>
            </Alert>
          )}

          {e.plan === "paid" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Subscription active</AlertTitle>
              <AlertDescription>
                Full access is unlocked
                {e.paidUntil ? ` through ${formatDate(e.paidUntil)}` : ""}.
              </AlertDescription>
            </Alert>
          )}

          {(e.plan === "trial" || e.plan === "expired") && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {e.plan === "trial"
                      ? `Free trial — ${e.trialDaysLeft} day${e.trialDaysLeft === 1 ? "" : "s"} remaining`
                      : "Your free trial has ended"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Limited access: 1 binder · 50 cards · no import, add, or
                    sync · limited analytics.
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  ${MONTHLY_PRICE_USD}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay with CashApp */}
      {!e.fullAccess && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Upgrade — pay with CashApp</CardTitle>
                <CardDescription>
                  ${MONTHLY_PRICE_USD}/month for full, unlimited access
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                Open CashApp and send{" "}
                <span className="font-semibold">
                  ${MONTHLY_PRICE_USD}
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
                  {CASHAPP_CASHTAG} <Copy className="h-3 w-3" />
                </button>{" "}
                <span className="text-muted-foreground">
                  (also shown as {CASHAPP_TAG_DISPLAY})
                </span>
                .
              </li>
              <li>
                Add your account email <strong>{email ?? "—"}</strong> in the
                CashApp note so we can match the payment.
              </li>
              <li>
                Come back and tap <strong>&ldquo;I&apos;ve sent payment&rdquo;</strong>{" "}
                below. We&apos;ll confirm it and unlock full access.
              </li>
            </ol>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cashtag">Your CashApp $cashtag (optional)</Label>
                <Input
                  id="cashtag"
                  placeholder="$yourtag"
                  value={cashtag}
                  onChange={(ev) => setCashtag(ev.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  placeholder="Payment reference / message"
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleSubmitPayment} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              I&apos;ve sent payment
            </Button>
            <p className="text-xs text-muted-foreground">
              New accounts get a {TRIAL_DAYS}-day free trial. Payments are
              reviewed manually, usually within a day. Questions? {BILLING_EMAIL}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Previous payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Every payment you&apos;ve submitted</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">
                      ${Number(p.amount).toFixed(2)} · CashApp
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.created_at)} · {p.invoice_number}
                    </p>
                  </div>
                  {statusBadge(p.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
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
              {confirmed.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">{p.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.period_start)} – {formatDate(p.period_end)} ·
                      ${Number(p.amount).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInvoice(p, email)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Invoice
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
