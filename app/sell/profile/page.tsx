"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Save,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const paymentOptions = [
  ["paypal", "PayPal"],
  ["venmo", "Venmo"],
  ["cash_app", "Cash App"],
  ["zelle", "Zelle"],
  ["stripe_link", "Stripe / Payment Link"],
  ["cash_local", "Cash / Local Pickup"],
  ["trade_only", "Trade Only"],
] as const

const shippingOptions = [
  ["envelope", "Envelope"],
  ["ground_advantage", "USPS Ground Advantage"],
  ["local_pickup", "Local Pickup"],
  ["seller_arranged", "Seller Arranged"],
] as const

type Profile = {
  display_name: string | null
  bio: string | null
  payment_methods: string[]
  payment_note: string | null
  shipping_methods: string[]
  shipping_note: string | null
  ships_us_only: boolean
  local_pickup: boolean
}

export default function SellerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile>({
    display_name: null,
    bio: null,
    payment_methods: [],
    payment_note: null,
    shipping_methods: [],
    shipping_note: null,
    ships_us_only: true,
    local_pickup: false,
  })

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/seller-profile", { cache: "no-store" })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || "Unable to load seller profile")
        setProfile(data.profile)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load seller profile")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function togglePayment(value: string) {
    setProfile((current) => ({
      ...current,
      payment_methods: current.payment_methods.includes(value)
        ? current.payment_methods.filter((item) => item !== value)
        : [...current.payment_methods, value],
    }))
  }

  function toggleShipping(value: string) {
    setProfile((current) => ({
      ...current,
      shipping_methods: current.shipping_methods.includes(value)
        ? current.shipping_methods.filter((item) => item !== value)
        : [...current.shipping_methods, value],
    }))
  }

  async function save() {
    setSaving(true)
    try {
      const response = await fetch("/api/seller-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.display_name,
          bio: profile.bio,
          paymentMethods: profile.payment_methods,
          paymentNote: profile.payment_note,
          shippingMethods: profile.shipping_methods,
          shippingNote: profile.shipping_note,
          shipsUsOnly: profile.ships_us_only,
          localPickup: profile.local_pickup,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Unable to save profile")
      setProfile(data.profile)
      toast.success("Seller preferences saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#09090b] text-zinc-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading seller settings…
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-6 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="text-zinc-300 hover:bg-white/10 hover:text-white">
            <Link href="/sell">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Sell Center
            </Link>
          </Button>

          <Button onClick={() => void save()} disabled={saving} className="bg-rose-600 text-white hover:bg-rose-500">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>

        <section className="rounded-[28px] border border-rose-500/20 bg-gradient-to-br from-zinc-950 to-rose-950/20 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-rose-500/10 p-3">
              <ShieldCheck className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">Seller Profile & Preferences</h1>
              <p className="mt-1 text-sm text-zinc-400">Tell buyers how you accept payment and ship cards. Never post passwords or sensitive account information here.</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/75 p-5">
          <h2 className="font-bold text-white">Public seller details</h2>
          <div className="mt-4 grid gap-4">
            <label className="text-sm text-zinc-300">
              Display / store name
              <Input
                value={profile.display_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                maxLength={80}
                className="mt-2 border-white/10 bg-zinc-900 text-white"
                placeholder="Team Rocket Cards"
              />
            </label>
            <label className="text-sm text-zinc-300">
              Seller bio
              <textarea
                value={profile.bio ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                maxLength={500}
                rows={4}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50"
                placeholder="Collector, store information, trade preferences..."
              />
            </label>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/75 p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-rose-400" />
            <h2 className="font-bold text-white">Accepted payment methods</h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {paymentOptions.map(([value, label]) => {
              const selected = profile.payment_methods.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePayment(value)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <label className="mt-4 block text-sm text-zinc-300">
            Payment note
            <textarea
              value={profile.payment_note ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, payment_note: e.target.value }))}
              maxLength={300}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50"
              placeholder="Example: PayPal Goods & Services preferred. Share usernames/payment links privately in chat."
            />
          </label>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/75 p-5">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-rose-400" />
            <h2 className="font-bold text-white">Shipping</h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {shippingOptions.map(([value, label]) => {
              const selected = profile.shipping_methods.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleShipping(value)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={profile.ships_us_only}
                onChange={(e) => setProfile((p) => ({ ...p, ships_us_only: e.target.checked }))}
              />
              U.S. shipping only
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={profile.local_pickup}
                onChange={(e) => setProfile((p) => ({ ...p, local_pickup: e.target.checked }))}
              />
              Local pickup available
            </label>
          </div>

          <label className="mt-4 block text-sm text-zinc-300">
            Shipping note
            <textarea
              value={profile.shipping_note ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, shipping_note: e.target.value }))}
              maxLength={300}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50"
              placeholder="Example: Orders over $20 ship Ground Advantage with tracking."
            />
          </label>
        </section>
      </div>
    </main>
  )
}