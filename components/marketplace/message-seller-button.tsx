"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MessageSellerButtonProps = {
  sellerId: string
  currentUserId?: string | null
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function MessageSellerButton({
  sellerId,
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
    if (!sellerId || isOwnListing || loading) return

    setLoading(true)

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: sellerId,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to start conversation",
        )
      }

      const conversationId =
        typeof result?.conversationId === "string"
          ? result.conversationId
          : ""

      if (!conversationId) {
        throw new Error("Conversation was not created")
      }

      router.push(`/messages/${conversationId}`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to message seller",
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