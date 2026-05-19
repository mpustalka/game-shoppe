"use client"

import { useState } from "react"
import type { PokemonCard, CardCondition, PriceTier } from "@/lib/types"
import { CARD_CONDITIONS, PRICE_TIERS } from "@/lib/types"
import { getMarketPrice } from "@/lib/pokemon-tcg"
import { useInventory } from "@/lib/inventory-context"
import * as binderApi from "@/lib/binders"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, ExternalLink, Package } from "lucide-react"

interface CardDetailModalProps {
  card: PokemonCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CardDetailModal({ card, open, onOpenChange }: CardDetailModalProps) {
  const { addItem, getItemsByCardId } = useInventory()
  const [condition, setCondition] = useState<CardCondition>("Near Mint")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [notes, setNotes] = useState("")
  const [binderTier, setBinderTier] = useState<PriceTier | "none">("none")
  const [isAdding, setIsAdding] = useState(false)

  if (!card) return null

  const marketPrice = getMarketPrice(card)
  const existingItems = getItemsByCardId(card.id)

  const handleAddToInventory = async () => {
    const priceValue = parseFloat(price)
    const quantityValue = parseInt(quantity, 10)

    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    if (isNaN(quantityValue) || quantityValue <= 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    setIsAdding(true)
    
    try {
      const item = await addItem(card, {
        condition,
        price: priceValue,
        quantity: quantityValue,
        notes: notes || undefined,
      })

      if (!item) {
        toast.error("Failed to add card to inventory")
        return
      }

      if (binderTier !== "none") {
        await binderApi.addToBinder(binderTier, item)
      }

      toast.success(binderTier === "none" ? "Card added to inventory" : "Card added to inventory and binder", {
        description: `SKU: ${item.sku}`,
      })

      // Reset form
      setCondition("Near Mint")
      setPrice("")
      setQuantity("1")
      setNotes("")
      setBinderTier("none")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to add card to inventory")
    } finally {
      setIsAdding(false)
    }
  }

  const handleSetMarketPrice = () => {
    if (marketPrice !== null) {
      setPrice(marketPrice.toFixed(2))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {card.name}
            <Badge variant="outline">#{card.number}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card Image */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-[300px]">
              <img
                src={card.images.large}
                alt={card.name}
                className="w-full rounded-lg shadow-lg"
              />
            </div>

            {/* External Links */}
            {card.tcgplayer?.url && (
              <Button asChild variant="outline" size="sm">
                <a href={card.tcgplayer.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on TCGPlayer
                </a>
              </Button>
            )}
          </div>

          {/* Card Details & Add Form */}
          <div>
            <Tabs defaultValue="add" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add">Add to Inventory</TabsTrigger>
                <TabsTrigger value="details">Card Details</TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="space-y-4 pt-4">
                {/* Existing Inventory Notice */}
                {existingItems.length > 0 && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">
                      <Package className="mr-1 inline h-4 w-4" />
                      You have {existingItems.length} listing(s) for this card
                    </p>
                  </div>
                )}

                {/* Condition */}
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={condition} onValueChange={(v) => setCondition(v as CardCondition)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="price">Price ($)</Label>
                    {marketPrice !== null && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={handleSetMarketPrice}
                      >
                        Use market price (${marketPrice.toFixed(2)})
                      </Button>
                    )}
                  </div>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about this card..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="binder">Binder</Label>
                  <Select value={binderTier} onValueChange={(v) => setBinderTier(v as PriceTier | "none")}>
                    <SelectTrigger id="binder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Inventory only</SelectItem>
                      {PRICE_TIERS.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          Add to {tier.label} binder
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add Button */}
                <Button
                  onClick={handleAddToInventory}
                  disabled={isAdding}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Inventory
                </Button>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="space-y-3">
                  <DetailRow label="Set" value={card.set.name} />
                  <DetailRow label="Series" value={card.set.series} />
                  <DetailRow label="Number" value={`${card.number}/${card.set.printedTotal}`} />
                  <DetailRow label="Rarity" value={card.rarity || "Unknown"} />
                  <DetailRow label="Type" value={card.supertype} />
                  {card.subtypes && <DetailRow label="Subtypes" value={card.subtypes.join(", ")} />}
                  {card.types && <DetailRow label="Energy Type" value={card.types.join(", ")} />}
                  {card.hp && <DetailRow label="HP" value={card.hp} />}
                  {card.artist && <DetailRow label="Artist" value={card.artist} />}
                  
                  {/* Market Prices */}
                  {card.tcgplayer?.prices && (
                    <div className="pt-3 border-t border-border">
                      <p className="mb-2 text-sm font-medium">TCGPlayer Prices</p>
                      <div className="space-y-1">
                        {card.tcgplayer.prices.normal?.market && (
                          <DetailRow label="Normal" value={`$${card.tcgplayer.prices.normal.market.toFixed(2)}`} />
                        )}
                        {card.tcgplayer.prices.holofoil?.market && (
                          <DetailRow label="Holofoil" value={`$${card.tcgplayer.prices.holofoil.market.toFixed(2)}`} />
                        )}
                        {card.tcgplayer.prices.reverseHolofoil?.market && (
                          <DetailRow label="Reverse Holo" value={`$${card.tcgplayer.prices.reverseHolofoil.market.toFixed(2)}`} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
