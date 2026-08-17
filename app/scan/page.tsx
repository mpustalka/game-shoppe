"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useInventory } from "@/lib/inventory-context"
import { parseQRCodeData } from "@/lib/barcode"

import { FeatureLocked, TrialBanner } from "@/components/billing/trial-banner"

import { useEntitlements } from "@/hooks/use-entitlements"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"

import { toast } from "sonner"

import { QrCode, Search, Keyboard, ArrowRight, Package } from "lucide-react"

export default function ScanPage() {
  const router = useRouter()

  const { getItemById, getItemBySku, getItemByBarcode, searchItems } =
    useInventory()

  const { entitlements, loading: entitlementsLoading } = useEntitlements()

  const scanAllowed = entitlements.canScan

  const [manualInput, setManualInput] = useState("")

  const [foundItem, setFoundItem] =
    useState<ReturnType<typeof getItemById>>(undefined)

  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Focus the scanner input only when
   * Scan is actually available.
   */
  useEffect(() => {
    if (entitlementsLoading || !scanAllowed) {
      return
    }

    inputRef.current?.focus()
  }, [entitlementsLoading, scanAllowed])

  const handleLookup = (value: string) => {
    if (!scanAllowed) {
      toast.error("Scan requires Premium")

      return
    }

    if (!value.trim()) {
      return
    }

    const trimmedValue = value.trim()

    /**
     * Try QR payload first.
     */
    const qrData = parseQRCodeData(trimmedValue)

    if (qrData) {
      const item = getItemById(qrData.id)

      if (item) {
        setFoundItem(item)

        toast.success("Item found via QR code")

        return
      }
    }

    /**
     * Try exact SKU.
     */
    let item = getItemBySku(trimmedValue)

    if (item) {
      setFoundItem(item)

      toast.success("Item found by SKU")

      return
    }

    /**
     * Try exact barcode.
     */
    item = getItemByBarcode(trimmedValue)

    if (item) {
      setFoundItem(item)

      toast.success("Item found by barcode")

      return
    }

    /**
     * Fall back to inventory search.
     */
    const searchResults = searchItems(trimmedValue)

    if (searchResults.length === 1) {
      setFoundItem(searchResults[0])

      toast.success("Item found")

      return
    }

    if (searchResults.length > 1) {
      toast.info(
        `Found ${searchResults.length} items. Redirecting to search...`,
      )

      router.push(`/search?q=${encodeURIComponent(trimmedValue)}`)

      return
    }

    setFoundItem(undefined)

    toast.error("No item found with that code or SKU")
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    handleLookup(manualInput)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    /**
     * Most USB barcode scanners send Enter
     * after the scan is complete.
     */
    if (event.key === "Enter") {
      event.preventDefault()

      handleLookup(manualInput)
    }
  }

  /**
   * Basic / expired users get the standard
   * Premium upgrade panel.
   */
  if (!entitlementsLoading && !scanAllowed) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <FeatureLocked
          title="Premium Scan & Lookup"
          description="Scan and barcode lookup tools are included with Premium. Upgrade to identify inventory items using QR codes, SKUs, barcodes, and connected scanners."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Trial countdown */}
      <div className="mb-6">
        <TrialBanner />
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <QrCode className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Scan or Lookup Item
        </h1>

        <p className="mt-2 text-muted-foreground">
          Scan a QR code or enter a SKU/barcode to find an inventory item.
        </p>
      </div>

      {/* Scanner Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Manual Entry / Barcode Scanner
          </CardTitle>

          <CardDescription>
            Enter a SKU, barcode, or scan with a connected scanner.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input
              ref={inputRef}
              type="text"
              placeholder="Scan barcode or enter SKU..."
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 font-mono"
              autoComplete="off"
            />

            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Lookup
            </Button>
          </form>

          <p className="mt-2 text-xs text-muted-foreground">
            Tip: connect a USB barcode scanner and scan directly into this
            field.
          </p>
        </CardContent>
      </Card>

      {/* Found Item */}
      {foundItem && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-primary">Item Found</CardTitle>
          </CardHeader>

          <CardContent>
            <Link
              href={`/inventory/${foundItem.id}`}
              className="flex flex-col gap-4 rounded-lg p-2 transition-colors hover:bg-muted sm:flex-row sm:items-center"
            >
              <img
                src={foundItem.card.images.small}
                alt={foundItem.card.name}
                className="mx-auto h-24 w-[68px] rounded object-cover sm:mx-0"
              />

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-medium text-foreground">
                  {foundItem.card.name}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {foundItem.card.set.name} - #{foundItem.card.number}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{foundItem.condition}</Badge>

                  <span className="text-sm text-muted-foreground">
                    Qty: {foundItem.quantity}
                  </span>
                </div>

                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  SKU: {foundItem.sku}
                </p>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-2xl font-bold text-primary">
                  ${foundItem.price.toFixed(2)}
                </p>
              </div>

              <ArrowRight className="hidden h-6 w-6 text-muted-foreground sm:block" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4" />
              QR Code Scanning
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-inside list-decimal space-y-1">
              <li>Print QR code labels from inventory items</li>

              <li>Use a barcode scanner to scan the QR code</li>

              <li>The scanner automatically looks up the item</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Keyboard className="h-4 w-4" />
              Manual SKU Entry
            </CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-muted-foreground">
            <ol className="list-inside list-decimal space-y-1">
              <li>Type or scan the SKU or barcode</li>

              <li>Press Enter or click Lookup</li>

              <li>Open the matching inventory item</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="outline">
          <Link href="/inventory">
            <Package className="mr-2 h-4 w-4" />
            View All Inventory
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Search Inventory
          </Link>
        </Button>
      </div>
    </div>
  )
}
