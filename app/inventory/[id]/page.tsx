"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useInventory } from "@/lib/inventory-context"
import { generateQRCodeDataURL, createQRCodeData } from "@/lib/barcode"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Printer,
  Copy,
  ExternalLink,
  RefreshCw,
  Package
} from "lucide-react"
import { EditInventoryModal } from "@/components/inventory/edit-inventory-modal"
import { DeleteConfirmDialog } from "@/components/inventory/delete-confirm-dialog"
import { SyncButton } from "@/components/square/sync-button"

interface InventoryDetailPageProps {
  params: Promise<{ id: string }>
}

export default function InventoryDetailPage({ params }: InventoryDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { getItemById, deleteItem } = useInventory()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const item = getItemById(id)

  useEffect(() => {
    if (item) {
      const qrData = createQRCodeData(
        item.id,
        item.sku,
        item.card,
        item.condition,
        item.price,
        item.printFinish
      )
      generateQRCodeDataURL(qrData, { width: 200 }).then(setQrCodeUrl)
    }
  }, [item])

  if (!item) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="mb-2 text-lg font-medium">Item Not Found</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            This inventory item does not exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/inventory">Back to Inventory</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleDelete = () => {
    deleteItem(item.id)
    toast.success("Item deleted from inventory")
    router.push("/inventory")
  }

  const handleCopySku = () => {
    navigator.clipboard.writeText(item.sku)
    toast.success("SKU copied to clipboard")
  }

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(item.barcode)
    toast.success("Barcode copied to clipboard")
  }

  const handlePrintLabel = () => {
    if (!qrCodeUrl) return

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Label - ${item.sku}</title>
            <style>
              @page { margin: 0; size: 2in 1in; }
              body { 
                margin: 0; 
                padding: 8px;
                font-family: system-ui, sans-serif;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              img { width: 80px; height: 80px; }
              .info { font-size: 8px; line-height: 1.3; }
              .name { font-weight: bold; font-size: 9px; }
              .price { font-weight: bold; font-size: 12px; margin-top: 4px; }
            </style>
          </head>
          <body>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <div class="info">
              <div class="name">${item.card.name}</div>
              <div>${item.condition}</div>
              <div>${item.sku}</div>
              <div class="price">$${item.price.toFixed(2)}</div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const createdDate = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const updatedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/inventory">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card Image */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <img
                src={item.card.images.large}
                alt={item.card.name}
                className="w-full rounded-lg"
              />
              {item.card.tcgplayer?.url && (
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <a href={item.card.tcgplayer.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on TCGPlayer
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{item.card.name}</CardTitle>
                  <CardDescription>
                    {item.card.set.name} - #{item.card.number}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price and Quantity */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-3xl font-bold text-primary">${item.price.toFixed(2)}</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="text-3xl font-bold">{item.quantity}</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-3xl font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              {/* Details Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <Badge variant="secondary" className="mt-1">{item.condition}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rarity</p>
                  <p className="mt-1 font-medium">{item.card.rarity || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Set</p>
                  <p className="mt-1 font-medium">{item.card.set.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Series</p>
                  <p className="mt-1 font-medium">{item.card.set.series}</p>
                </div>
              </div>

              {item.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1">{item.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* QR Code & SKU */}
          <Card>
            <CardHeader>
              <CardTitle>Barcode & SKU</CardTitle>
              <CardDescription>Use these identifiers for inventory tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-2">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="h-32 w-32 rounded-lg border" />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-lg border bg-muted">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={handlePrintLabel}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Label
                  </Button>
                </div>

                {/* SKU and Barcode */}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                        {item.sku}
                      </code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopySku}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Barcode</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                        {item.barcode}
                      </code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyBarcode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Square Sync Status */}
          <Card>
            <CardHeader>
              <CardTitle>Square POS Integration</CardTitle>
              <CardDescription>Sync this item with your Square catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {item.syncedToSquare ? "Synced to Square" : "Not synced"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.syncedToSquare 
                      ? `Item ID: ${item.squareItemId}` 
                      : "Click sync to add this item to your Square catalog"
                    }
                  </p>
                </div>
                <SyncButton item={item} />
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <div className="text-sm text-muted-foreground">
            <p>Added: {createdDate}</p>
            <p>Last updated: {updatedDate}</p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditInventoryModal
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        itemName={item.card.name}
      />
    </div>
  )
}
