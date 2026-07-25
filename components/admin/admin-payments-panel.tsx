"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, CheckCircle, XCircle, Clock, Wallet } from "lucide-react"
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
import { CASHAPP_CASHTAG } from "@/lib/entitlements"

interface AdminPayment {
  id: string
  email: string
  invoice_number: string
  amount: number
  status: "pending" | "confirmed" | "rejected"
  cashtag: string
  note: string
  period_start: string
  period_end: string
  created_at: string
}

function fmt(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

// Admin portal panel for reviewing manually-submitted CashApp payments.
// Confirming a payment is what unlocks full access for that account.
export function AdminPaymentsPanel() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments")
      if (res.ok) setPayments(await res.json())
    } catch {
      // leave the list empty on failure
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (id: string, action: "confirm" | "reject") => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/payments/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      toast.success(
        action === "confirm"
          ? "Payment confirmed — full access unlocked"
          : "Payment rejected",
      )
      await load()
    } catch {
      toast.error("Couldn't update that payment")
    } finally {
      setBusyId(null)
    }
  }

  const pending = payments.filter((p) => p.status === "pending")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Subscription payments</CardTitle>
            <CardDescription>
              Review CashApp payments sent to {CASHAPP_CASHTAG}
              {pending.length > 0 && ` · ${pending.length} awaiting review`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading payments…
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments submitted yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(p.amount).toFixed(2)} · {p.invoice_number} ·{" "}
                    {fmt(p.created_at)}
                    {p.cashtag ? ` · from ${p.cashtag}` : ""}
                  </p>
                  {p.note && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">
                      “{p.note}”
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {p.status === "confirmed" && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                      <CheckCircle className="mr-1 h-3 w-3" /> Confirmed
                    </Badge>
                  )}
                  {p.status === "rejected" && (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" /> Rejected
                    </Badge>
                  )}
                  {p.status === "pending" && (
                    <>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                      <Button
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => act(p.id, "confirm")}
                      >
                        {busyId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === p.id}
                        onClick={() => act(p.id, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
