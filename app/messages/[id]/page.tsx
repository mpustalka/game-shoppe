"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")
  const endRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages/${id}`, {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load conversation")
      }

      setMessages(data?.messages ?? [])
      setCurrentUserId(data?.currentUserId ?? "")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load conversation",
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!id) return

    const supabase = createClient()

    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        () => {
          void load()
        },
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
    if (!trimmed || sending) return

    setSending(true)

    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: trimmed }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to send message")
      }

      setBody("")
      await load()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to send message",
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#070708] p-3 text-white sm:p-5">
      <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-4xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Link href="/messages">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
            <MessageCircle className="h-4 w-4 text-rose-400" />
          </div>

          <div>
            <p className="font-semibold">Private Conversation</p>
            <p className="text-xs text-white/35">
              Only conversation members can read these messages.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
          {loading ? (
            <div className="flex h-full items-center justify-center text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading chat…
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const mine = message.sender_id === currentUserId

                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={
                        mine
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-rose-600 px-4 py-2.5 text-sm text-white sm:max-w-[70%]"
                          : "max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm text-white/85 sm:max-w-[70%]"
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                      <p
                        className={`mt-1 text-[10px] ${
                          mine ? "text-white/55" : "text-white/30"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={send}
          className="flex gap-2 border-t border-white/10 bg-[#0b0b0e] p-3 sm:p-4"
        >
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            placeholder="Type a private message..."
            className="h-11 border-white/10 bg-white/[0.045] text-white placeholder:text-white/30"
          />

          <Button
            type="submit"
            disabled={sending || !body.trim()}
            className="h-11 rounded-xl bg-rose-600 px-4 hover:bg-rose-500"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}