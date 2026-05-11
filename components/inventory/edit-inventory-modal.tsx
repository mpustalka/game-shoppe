"use client"

import { useState, useEffect } from "react"
import type { InventoryItem, CardCondition } from "@/lib/types"
import { CARD_CONDITIONS } from "@/lib/types"
import { useInventory } from "@/lib/inventory-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface EditInventoryModalProps {
  item: InventoryItem | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInventoryModal({ item, open, onOpenChange }: EditInventoryModalProps) {
  const { updateItem } = useInventory()
  const [condition, setCondition] = useState<CardCondition>("Near Mint")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [quantitySold, setQuantitySold] = useState("0")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setCondition(item.condition)
      setPrice(item.price.toString())
      setQuantity(item.quantity.toString())
      setQuantitySold((item.quantitySold || 0).toString())
      setNotes(item.notes || "")
    }
  }, [item])

  if (!item) return null

  const handleSave = async () => {
    const priceValue = parseFloat(price)
    const quantityValue = parseInt(quantity, 10)
    const quantitySoldValue = parseInt(quantitySold, 10)

    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    if (isNaN(quantityValue) || quantityValue < 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    setIsSaving(true)

    try {
      await updateItem(item.id, {
        condition,
        price: priceValue,
        quantity: quantityValue,
        quantitySold: quantitySoldValue || 0,
        notes: notes || undefined,
      })
      toast.success("Inventory item updated")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update item")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4 py-4">
          <img
            src={item.card.images.small}
            alt={item.card.name}
            className="h-24 w-18 rounded object-cover"
          />
          <div>
            <h3 className="font-medium text-foreground">{item.card.name}</h3>
            <p className="text-sm text-muted-foreground">{item.card.set.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">SKU: {item.sku}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor="edit-condition">Condition</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as CardCondition)}>
              <SelectTrigger id="edit-condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARD_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="edit-price">Price ($)</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Qty Available</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sold">Qty Sold</Label>
              <Input
                id="edit-sold"
                type="number"
                min="0"
                value={quantitySold}
                onChange={(e) => setQuantitySold(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
