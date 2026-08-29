"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Ticket = {
  id: string
  subject: string
  category: string
  status: string
  created_at: string
}

type SupportMessage = {
  id: string
  sender_id: string
  sender_role: "user" | "admin"
  body: string
  created_at: string
}

export default function SupportThreadPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/support/${id}`, {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load support request")
      }

      setTicket(data.ticket)
      setMessages(data.messages ?? [])
      setCurrentUserId(data.currentUserId ?? "")
      setIsAdmin(Boolean(data.isAdmin))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load support request",
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`support-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${id}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id, load])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()

    if (!trimmed) return

    setSending(true)

    try {
      const response = await fetch(`/api/support/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to send reply")
      }

      setBody("")
      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send reply",
      )
    } finally {
      setSending(false)
    }
  }

  async function resolve() {
    const response = await fetch(`/api/support/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(data?.error || "Unable to resolve ticket")
      return
    }

    toast.success("Support request resolved")
    await load()
  }

  return (
    <main className="min-h-screen bg-[#070708] p-3 text-white sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-4xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Link href={isAdmin ? "/admin/support" : "/support"}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="min-w-0">
              <p className="truncate font-bold">
                {ticket?.subject || "Support Request"}
              </p>
              <p className="mt-0.5 text-xs text-white/35">
                Typical response time: 24–48 hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ticket && (
              <Badge
                variant="outline"
                className="border-white/10 bg-white/[0.04] capitalize text-white/60"
              >
                {ticket.status.replaceAll("_", " ")}
              </Badge>
            )}

            {isAdmin && ticket?.status !== "resolved" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void resolve()}
                className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Resolve
              </Button>
            )}
          </div>
        </div>

        <div className="min-h-[400px] flex-1 overflow-y-auto px-3 py-5 sm:px-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading support thread…
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const mine = message.sender_id === currentUserId
                const adminMessage = message.sender_role === "admin"

                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={
                        adminMessage
                          ? "max-w-[85%] rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 sm:max-w-[75%]"
                          : mine
                            ? "max-w-[85%] rounded-2xl bg-rose-600 px-4 py-3 sm:max-w-[75%]"
                            : "max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 sm:max-w-[75%]"
                      }
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        {adminMessage ? "Team Rocket Support" : "Customer"}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {message.body}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {ticket?.status !== "resolved" ? (
          <form
            onSubmit={send}
            className="flex gap-2 border-t border-white/10 bg-[#0b0b0e] p-3 sm:p-4"
          >
            <Input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                isAdmin ? "Reply as Team Rocket Support..." : "Reply to support..."
              }
              className="h-11 border-white/10 bg-white/[0.045] text-white placeholder:text-white/30"
            />
            <Button
              type="submit"
              disabled={sending || !body.trim()}
              className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        ) : (
          <div className="border-t border-white/10 p-4 text-center text-sm text-white/40">
            This support request has been resolved.
          </div>
        )}
      </div>
    </main>
  )
}