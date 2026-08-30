"use client"

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  ImagePlus,
  Loader2,
  MessageCircle,
  Package,
  Send,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type JsonObject = Record<string, unknown>

type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  sell_listing_id?: string | null
  listing_snapshot?: JsonObject | null
  attachment_path?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
  attachment_url?: string | null
  message_kind?: string | null
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function money(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : ""
}

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    paypal: "PayPal",
    venmo: "Venmo",
    cash_app: "Cash App",
    zelle: "Zelle",
    stripe_link: "Stripe / Payment Link",
    cash_local: "Cash / Local",
    trade_only: "Trade Only",
  }
  return labels[value] ?? value.replaceAll("_", " ")
}

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const previewUrl = useMemo(
    () => (attachment ? URL.createObjectURL(attachment) : ""),
    [attachment],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  function chooseAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""

    if (!file) return

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      toast.error("Use a JPG, PNG, WEBP, or GIF image")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MB or smaller")
      return
    }

    setAttachment(file)
  }

  async function send(event: FormEvent) {
    event.preventDefault()

    const trimmed = body.trim()
    if ((!trimmed && !attachment) || sending || !currentUserId) return

    setSending(true)
    let uploadedPath = ""

    try {
      if (attachment) {
        const supabase = createClient()
        const extension =
          attachment.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
          "jpg"
        uploadedPath = `${currentUserId}/${id}/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(uploadedPath, attachment, {
            cacheControl: "3600",
            contentType: attachment.type,
            upsert: false,
          })

        if (uploadError) throw new Error(uploadError.message)
      }

      const response = await fetch(`/api/messages/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          messageKind: attachment ? "image" : "text",
          attachmentPath: uploadedPath || null,
          attachmentType: attachment?.type ?? null,
          attachmentName: attachment?.name ?? null,
          attachmentSize: attachment?.size ?? null,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        if (uploadedPath) {
          const supabase = createClient()
          await supabase.storage.from("message-attachments").remove([uploadedPath])
        }
        throw new Error(data?.error || "Unable to send message")
      }

      setBody("")
      setAttachment(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#070708] p-3 text-white sm:p-5">
      <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-4xl flex-col overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.025]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <Button asChild variant="ghost" size="icon" className="rounded-xl text-white/60 hover:bg-white/10 hover:text-white">
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
              Card details and photos stay with this conversation.
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
                const snapshot = message.listing_snapshot ?? null
                const paymentMethods = Array.isArray(snapshot?.paymentMethods)
                  ? snapshot.paymentMethods.filter(
                      (value): value is string => typeof value === "string",
                    )
                  : []
                const listingName = firstString(snapshot?.name)
                const listingNumber = firstString(snapshot?.number)
                const listingImage = firstString(snapshot?.image)
                const askingPrice = money(snapshot?.askingPrice)

                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={
                        mine
                          ? "max-w-[92%] rounded-2xl rounded-br-md bg-rose-600 px-4 py-3 text-sm text-white sm:max-w-[76%]"
                          : "max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white/85 sm:max-w-[76%]"
                      }
                    >
                      {snapshot && listingName && (
                        <div className={`mb-3 overflow-hidden rounded-xl border ${mine ? "border-white/20 bg-black/15" : "border-white/10 bg-black/25"}`}>
                          <div className="flex gap-3 p-3">
                            <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
                              {listingImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={listingImage} alt={listingName} className="h-full w-full object-contain" />
                              ) : (
                                <Package className="h-6 w-6 text-white/30" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200">
                                Interested in this card
                              </p>
                              <p className="mt-1 font-black text-white">
                                {listingName}{listingNumber ? ` ${listingNumber}` : ""}
                              </p>
                              <p className="mt-1 text-xs text-white/60">
                                {[firstString(snapshot?.setName), firstString(snapshot?.condition), firstString(snapshot?.finish)]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </p>
                              {askingPrice && (
                                <p className="mt-2 text-lg font-black text-white">{askingPrice}</p>
                              )}
                            </div>
                          </div>

                          {paymentMethods.length > 0 && (
                            <div className="border-t border-white/10 px-3 py-2 text-[11px] text-white/65">
                              Accepted: {paymentMethods.map(paymentLabel).join(" • ")}
                            </div>
                          )}

                          {message.sell_listing_id && (
                            <Link
                              href={`/marketplace?listing=${encodeURIComponent(message.sell_listing_id)}`}
                              className="flex items-center justify-center gap-1.5 border-t border-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white"
                            >
                              View Marketplace
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      )}

                      {message.attachment_url && (
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-3 block overflow-hidden rounded-xl border border-white/15 bg-black/25"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.attachment_url}
                            alt={message.attachment_name || "Message attachment"}
                            className="max-h-[420px] w-full object-contain"
                          />
                        </a>
                      )}

                      {message.body && (
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      )}

                      <p className={`mt-1 text-[10px] ${mine ? "text-white/55" : "text-white/30"}`}>
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

        {attachment && (
          <div className="border-t border-white/10 bg-[#0b0b0e] px-3 pt-3 sm:px-4">
            <div className="inline-flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Attachment preview" className="h-20 w-20 rounded-lg object-cover" />
              <div className="max-w-[220px]">
                <p className="truncate text-xs font-semibold text-white">{attachment.name}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  {(attachment.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAttachment(null)}
                className="h-7 w-7 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={send} className="flex gap-2 border-t border-white/10 bg-[#0b0b0e] p-3 sm:p-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={chooseAttachment}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => inputRef.current?.click()}
            disabled={sending}
            className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10 hover:text-white"
            title="Attach image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>

          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            placeholder={attachment ? "Add a message (optional)..." : "Type a private message..."}
            className="h-11 border-white/10 bg-white/[0.045] text-white placeholder:text-white/30"
          />

          <Button
            type="submit"
            disabled={sending || (!body.trim() && !attachment)}
            className="h-11 rounded-xl bg-rose-600 px-4 hover:bg-rose-500"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </main>
  )
}