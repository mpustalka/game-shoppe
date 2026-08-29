"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Clock3,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquareText,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Ticket = {
  id: string
  subject: string
  category: string
  status: string
  updated_at: string
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("general")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/support", { cache: "no-store" })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load support")
      }

      setTickets(data?.tickets ?? [])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load support",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          category,
          message,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to create support request")
      }

      setOpen(false)
      setSubject("")
      setCategory("general")
      setMessage("")
      await load()
      toast.success("Support request submitted")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create support request",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#070708] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,.18),transparent_34%),rgba(255,255,255,.03)] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <LifeBuoy className="h-4 w-4" />
                Team Rocket Support
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Support Center
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                Send a private support request or contact us by email. Support is
                not live chat; most requests receive a response within 24–48 hours.
              </p>
            </div>

            <Button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Support Request
            </Button>
          </div>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
            <Clock3 className="h-5 w-5 text-rose-400" />
            <h2 className="mt-3 font-bold">24–48 hour response time</h2>
            <p className="mt-1 text-sm leading-6 text-white/40">
              Support requests are reviewed by the Team Rocket Markets admin.
              Please include enough detail for us to reproduce the issue.
            </p>
          </div>

          <a
            href="mailto:admin@evileevee.com"
            className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-rose-400/25 hover:bg-white/[0.05]"
          >
            <Mail className="h-5 w-5 text-rose-400" />
            <h2 className="mt-3 font-bold">Email Support</h2>
            <p className="mt-1 text-sm text-white/40">
              admin@evileevee.com
            </p>
          </a>
        </div>

        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-bold">My Support Requests</h2>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading requests…
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-white/40">
              You have no support requests yet.
            </div>
          ) : (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center gap-4 border-b border-white/8 px-4 py-4 transition last:border-0 hover:bg-white/[0.04] sm:px-5"
              >
                <MessageSquareText className="h-5 w-5 shrink-0 text-rose-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{ticket.subject}</p>
                  <p className="mt-1 text-xs capitalize text-white/35">
                    {ticket.category.replaceAll("_", " ")} · Updated{" "}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#111114] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Support Request</DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="What do you need help with?"
                className="border-white/10 bg-white/[0.045] text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border-white/10 bg-white/[0.045] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#111114] text-white">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="binders">Binders</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-40 w-full resize-y rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-rose-400/30"
                placeholder="Describe the issue, what you expected, and what happened."
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-500"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Support Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}