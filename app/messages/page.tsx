"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Conversation = {
  id: string
  updated_at: string
  participant: {
    id: string
    displayName: string
  } | null
  latestMessage: {
    body: string
    created_at: string
  } | null
  unread: boolean
}

type UserResult = {
  id: string
  displayName: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [newOpen, setNewOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/messages", {
        cache: "no-store",
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load messages")
      }

      setConversations(data?.conversations ?? [])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load messages",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!newOpen) return

    const timer = window.setTimeout(async () => {
      setSearching(true)

      try {
        const response = await fetch(
          `/api/messages/users?q=${encodeURIComponent(search)}`,
          { cache: "no-store" },
        )

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || "Unable to search users")
        }

        setUsers(data?.users ?? [])
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to search users",
        )
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [newOpen, search])

  async function startConversation(userId: string) {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      toast.error(data?.error || "Unable to start conversation")
      return
    }

    setNewOpen(false)
    router.push(`/messages/${data.conversationId}`)
  }

  return (
    <main className="min-h-screen bg-[#070708] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(225,29,72,.18),transparent_34%),rgba(255,255,255,.03)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <MessageCircle className="h-4 w-4" />
                Private Collector Chat
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
                Messages
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                Message other signed-in collectors privately. Use chat to discuss
                listings, trades, payment preferences, shipping, and card details.
              </p>
            </div>

            <Button
              onClick={() => setNewOpen(true)}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-white/45">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading conversations…
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Users className="mx-auto h-10 w-10 text-white/20" />
              <h2 className="mt-4 text-lg font-bold">No conversations yet</h2>
              <p className="mt-1 text-sm text-white/40">
                Start a private conversation with another collector.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-4 border-b border-white/8 px-4 py-4 transition last:border-b-0 hover:bg-white/[0.04] sm:px-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 font-black text-rose-300">
                  {(conversation.participant?.displayName || "C")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">
                      {conversation.participant?.displayName || "Collector"}
                    </p>
                    {conversation.unread && (
                      <Badge className="bg-rose-600 text-white">New</Badge>
                    )}
                  </div>

                  <p className="mt-1 truncate text-sm text-white/40">
                    {conversation.latestMessage?.body || "Start the conversation"}
                  </p>
                </div>

                <Send className="h-4 w-4 shrink-0 text-white/25" />
              </Link>
            ))
          )}
        </section>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto border-white/10 bg-[#111114] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Private Message</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search collectors..."
              className="h-11 border-white/10 bg-white/[0.045] pl-9 text-white placeholder:text-white/30"
            />
          </div>

          <div className="mt-2 space-y-1">
            {searching ? (
              <div className="py-8 text-center text-sm text-white/40">
                <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">
                No collectors found.
              </p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => void startConversation(user.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 font-bold text-rose-300">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold">{user.displayName}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}