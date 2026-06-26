"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { loadSharedShowcase, type ShowcaseBinder } from "@/lib/showcase"
import { ShowcaseBinderView } from "@/components/inventory/showcase-binder-view"
import { BookOpen, Sparkles } from "lucide-react"

export default function SharedShowcasePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [showcase, setShowcase] = useState<ShowcaseBinder | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    if (!token) return
    loadSharedShowcase(token)
      .then((data) => {
        setShowcase(data)
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [token])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_6%,rgba(255,213,79,.34),transparent_28%),radial-gradient(circle_at_92%_2%,rgba(59,130,246,.18),transparent_24%),linear-gradient(180deg,#fffdf4_0%,#f4fbff_48%,#fff9ea_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Public header */}
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-red-500 bg-white shadow-sm">
            <BookOpen className="h-5 w-5 text-blue-700" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Game Shop · Shared Binder
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {showcase?.name ?? "Showcase"}
            </h1>
          </div>
        </div>

        {status === "loading" ? (
          <div className="py-24 text-center text-muted-foreground">
            Loading showcase…
          </div>
        ) : status === "error" || !showcase ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/70 py-24 text-center">
            <Sparkles className="mb-4 h-10 w-10 text-yellow-500" />
            <h2 className="mb-1 text-lg font-semibold">
              This showcase isn&apos;t available
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              The link may be incorrect or the binder may have been removed.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100/80 bg-white/88 p-4 shadow-xl shadow-blue-100/40 backdrop-blur sm:p-6">
            <p className="mb-4 text-sm text-muted-foreground">
              {showcase.items.length} card
              {showcase.items.length === 1 ? "" : "s"} in this binder
            </p>
            <ShowcaseBinderView
              title={showcase.name}
              items={showcase.items}
              readOnly
            />
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Shared with Card Vault
        </p>
      </div>
    </div>
  )
}
