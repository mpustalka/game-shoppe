"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  LifeBuoy,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Ticket = {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  updated_at: string
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/support", { cache: "no-store" })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load support tickets")
      }

      setTickets(data?.tickets ?? [])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load support tickets",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="min-h-screen bg-[#070708] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Button
          asChild
          variant="ghost"
          className="-ml-3 mb-4 text-white/55 hover:bg-white/10 hover:text-white"
        >
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Admin Control Center
          </Link>
        </Button>

        <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,.18),transparent_34%),rgba(255,255,255,.03)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <LifeBuoy className="h-4 w-4" />
                Admin Support Queue
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Support Requests
              </h1>
              <p className="mt-3 text-sm text-white/45">
                Review and reply to customer support requests.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => void load()}
              className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading support queue…
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-white/40">
              No support requests.
            </div>
          ) : (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center gap-4 border-b border-white/8 px-4 py-4 transition last:border-0 hover:bg-white/[0.04] sm:px-5"
              >
                <LifeBuoy className="h-5 w-5 shrink-0 text-rose-400" />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ticket.subject}</p>
                  <p className="mt-1 text-xs capitalize text-white/35">
                    {ticket.category.replaceAll("_", " ")} ·{" "}
                    {new Date(ticket.updated_at).toLocaleString()}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] capitalize text-white/60"
                >
                  {ticket.status.replaceAll("_", " ")}
                </Badge>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  )
}