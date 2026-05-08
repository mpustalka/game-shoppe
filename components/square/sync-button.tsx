"use client"

import { useState } from "react"
import type { InventoryItem } from "@/lib/types"
import { useInventory } from "@/lib/inventory-context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw, Check, AlertCircle } from "lucide-react"

interface SyncButtonProps {
  item: InventoryItem
  onSyncComplete?: () => void
}

export function SyncButton({ item, onSyncComplete }: SyncButtonProps) {
  const { updateSquareSync } = useInventory()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      const response = await fetch("/api/square/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ item }),
      })

      const result = await response.json()

      if (result.success) {
        updateSquareSync(item.id, result.itemId, result.variationId)
        toast.success("Synced to Square", {
          description: `Item ID: ${result.itemId}`,
        })
        onSyncComplete?.()
      } else {
        toast.error("Sync failed", {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error("Sync failed", {
        description: "Could not connect to Square API",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (item.syncedToSquare) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Check className="mr-2 h-4 w-4 text-green-500" />
        Synced
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync to Square
        </>
      )}
    </Button>
  )
}
