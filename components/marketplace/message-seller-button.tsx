"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ListingMessageSnapshot = {
  name: string
  number?: string
  setName?: string
  image?: string
  condition?: string
  finish?: string
  askingPrice?: number | string | null
  listingType?: "sale" | "trade" | "both" | null
  shippingMethod?: string | null
  sellerDisplayName?: string
  paymentMethods?: string[]
  paymentNote?: string | null
}

type MessageSellerButtonProps = {
  sellerId: string
  listingId: string
  listingSnapshot: ListingMessageSnapshot
  currentUserId?: string | null
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function MessageSellerButton({
  sellerId,
  listingId,
  listingSnapshot,
  currentUserId,
  className,
  size = "default",
  variant = "default",
}: MessageSellerButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isOwnListing =
    Boolean(currentUserId) && currentUserId === sellerId

  async function startConversation() {
    if (!sellerId || !listingId || isOwnListing || loading) return

    setLoading(true)

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: sellerId }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error || "Unable to start conversation")
      }

      const conversationId =
        typeof result?.conversationId === "string"
          ? result.conversationId
          : ""

      if (!conversationId) {
        throw new Error("Conversation was not created")
      }

      const contextResponse = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: "I'm interested in this card.",
          messageKind: "listing",
          sellListingId: listingId,
          listingSnapshot,
        }),
      })

      const contextResult = await contextResponse.json().catch(() => null)

      if (!contextResponse.ok) {
        throw new Error(
          contextResult?.error || "Unable to attach listing to conversation",
        )
      }

      router.push(`/messages/${conversationId}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to message seller",
      )
    } finally {
      setLoading(false)
    }
  }

  if (isOwnListing) {
    return (
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled
        className={cn(
          "border-white/10 bg-white/[0.04] text-zinc-400",
          className,
        )}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Your Listing
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={loading}
      onClick={() => void startConversation()}
      className={cn(
        "bg-rose-600 font-bold text-white hover:bg-rose-500",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="mr-2 h-4 w-4" />
      )}
      Message Seller
    </Button>
  )
}