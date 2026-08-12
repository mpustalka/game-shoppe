"use client"

import { useEffect, useMemo, useState } from "react"

import type { PokemonCard, CardCondition, CardFinish } from "@/lib/types"

import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  getDefaultCardFinish,
} from "@/lib/types"

import { getMarketPrice } from "@/lib/pokemon-tcg"
import { useInventory } from "@/lib/inventory-context"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { toast } from "sonner"

import { DollarSign, RefreshCw, PackagePlus } from "lucide-react"

interface BulkInventoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: PokemonCard[]
  language?: "en" | "ja"
  onSuccess?: () => void
}

interface BulkCardRow {
  card: PokemonCard
  condition: CardCondition
  finish: CardFinish
  language: "en" | "ja"
  quantity: number
  price: number
}

/**
 * Determine the most appropriate TCGPlayer market price
 * based on the finish selected for an inventory row.
 *
 * Examples:
 * Reverse Holo -> reverseHolofoil
 * Holo -> holofoil
 * Normal / Non Holo -> normal
 *
 * If that specific price isn't available, fall back to the
 * existing getMarketPrice() helper.
 */
function getTCGMarketPriceForFinish(
  card: PokemonCard,
  finish: CardFinish,
): number | null {
  const prices = card.tcgplayer?.prices

  if (!prices) {
    return getMarketPrice(card)
  }

  let price: number | null | undefined

  switch (finish) {
    case "Reverse Holo":
    case "Pokeball Reverse Holo":
    case "Energy Symbol Reverse Holo":
    case "Masterball Reverse Holo":
    case "Other Reverse Holo":
      price = prices.reverseHolofoil?.market
      break

    case "Holo":
    case "Rainbow Holo":
    case "Baby Shiny Holo":
    case "Cosmo Holo":
    case "Stamped":
    case "Other Holo":
    case "Full Art":
      price = prices.holofoil?.market
      break

    case "Normal":
    case "Non Holo":
      price = prices.normal?.market
      break

    default:
      price = null
  }

  if (typeof price === "number" && Number.isFinite(price) && price > 0) {
    return price
  }

  return getMarketPrice(card)
}

function getTCGPriceTypeLabel(card: PokemonCard, finish: CardFinish): string {
  const prices = card.tcgplayer?.prices

  if (!prices) {
    return "TCG Market"
  }

  if (
    [
      "Reverse Holo",
      "Pokeball Reverse Holo",
      "Energy Symbol Reverse Holo",
      "Masterball Reverse Holo",
      "Other Reverse Holo",
    ].includes(finish)
  ) {
    if (prices.reverseHolofoil?.market != null) {
      return "TCG Reverse Holo"
    }
  }

  if (
    [
      "Holo",
      "Rainbow Holo",
      "Baby Shiny Holo",
      "Cosmo Holo",
      "Stamped",
      "Other Holo",
      "Full Art",
    ].includes(finish)
  ) {
    if (prices.holofoil?.market != null) {
      return "TCG Holo"
    }
  }

  if (
    ["Normal", "Non Holo"].includes(finish) &&
    prices.normal?.market != null
  ) {
    return "TCG Normal"
  }

  return "TCG Market"
}

export function BulkInventoryModal({
  open,
  onOpenChange,
  cards,
  language = "en",
  onSuccess,
}: BulkInventoryModalProps) {
  const { addItem } = useInventory()

  const [rows, setRows] = useState<BulkCardRow[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const [bulkCondition, setBulkCondition] = useState<CardCondition>("Near Mint")

  const [bulkFinish, setBulkFinish] = useState<CardFinish | "auto">("auto")

  const [bulkLanguage, setBulkLanguage] = useState<"en" | "ja">(language)

  const [bulkQuantity, setBulkQuantity] = useState("1")

  /**
   * Build rows whenever the modal opens.
   */
  useEffect(() => {
    if (!open) return

    const nextRows: BulkCardRow[] = cards.map((card) => {
      const finish = getDefaultCardFinish(card)

      return {
        card,
        condition: "Near Mint",
        finish,
        language,
        quantity: 1,
        price:
          getTCGMarketPriceForFinish(card, finish) ??
          getMarketPrice(card) ??
          0.01,
      }
    })

    setRows(nextRows)

    setBulkCondition("Near Mint")
    setBulkFinish("auto")
    setBulkLanguage(language)
    setBulkQuantity("1")
  }, [open, cards, language])

  const totalQuantity = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.quantity, 0)
  }, [rows])

  const totalInventoryValue = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.price * row.quantity, 0)
  }, [rows])

  const updateRow = (
    cardId: string,
    patch: Partial<Omit<BulkCardRow, "card">>,
  ) => {
    setRows((previous) =>
      previous.map((row) =>
        row.card.id === cardId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    )
  }

  /**
   * Change finish and automatically refresh TCG price
   * for that finish.
   */
  const updateRowFinish = (cardId: string, finish: CardFinish) => {
    setRows((previous) =>
      previous.map((row) => {
        if (row.card.id !== cardId) {
          return row
        }

        const tcgPrice = getTCGMarketPriceForFinish(row.card, finish)

        return {
          ...row,
          finish,
          price: tcgPrice ?? row.price,
        }
      }),
    )
  }

  const applyConditionToAll = () => {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        condition: bulkCondition,
      })),
    )
  }

  /**
   * Apply finish and update prices at the same time.
   */
  const applyFinishToAll = () => {
    setRows((previous) =>
      previous.map((row) => {
        const finish =
          bulkFinish === "auto" ? getDefaultCardFinish(row.card) : bulkFinish

        const tcgPrice = getTCGMarketPriceForFinish(row.card, finish)

        return {
          ...row,
          finish,
          price: tcgPrice ?? row.price,
        }
      }),
    )
  }

  const applyLanguageToAll = () => {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        language: bulkLanguage,
      })),
    )
  }

  const applyQuantityToAll = () => {
    const quantity = Number.parseInt(bulkQuantity, 10)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity")
      return
    }

    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        quantity,
      })),
    )
  }

  /**
   * Refresh every row using its currently selected finish.
   */
  const applyTCGPricesToAll = () => {
    let found = 0

    setRows((previous) =>
      previous.map((row) => {
        const marketPrice = getTCGMarketPriceForFinish(row.card, row.finish)

        if (marketPrice === null) {
          return row
        }

        found++

        return {
          ...row,
          price: marketPrice,
        }
      }),
    )

    if (found === 0) {
      toast.error("No TCGPlayer market prices were available")
    } else {
      toast.success(`Updated ${found} TCGPlayer price${found === 1 ? "" : "s"}`)
    }
  }

  const updateSingleTCGPrice = (cardId: string) => {
    setRows((previous) =>
      previous.map((row) => {
        if (row.card.id !== cardId) {
          return row
        }

        const marketPrice = getTCGMarketPriceForFinish(row.card, row.finish)

        if (marketPrice === null) {
          toast.error(`No TCGPlayer price available for ${row.card.name}`)

          return row
        }

        toast.success(`${row.card.name}: $${marketPrice.toFixed(2)}`)

        return {
          ...row,
          price: marketPrice,
        }
      }),
    )
  }

  const handleAddAll = async () => {
    if (rows.length === 0) return

    const invalidRow = rows.find(
      (row) =>
        !Number.isFinite(row.price) ||
        row.price <= 0 ||
        !Number.isFinite(row.quantity) ||
        row.quantity <= 0,
    )

    if (invalidRow) {
      toast.error(`Check price and quantity for ${invalidRow.card.name}`)

      return
    }

    setIsAdding(true)

    let success = 0
    let failed = 0

    try {
      for (const row of rows) {
        try {
          const item = await addItem(row.card, {
            condition: row.condition,
            finish: row.finish,
            price: row.price,
            quantity: row.quantity,
            language: row.language,
          })

          if (item) {
            success++
          } else {
            failed++
          }
        } catch (error) {
          console.error(`Failed to bulk add ${row.card.name}:`, error)

          failed++
        }
      }

      if (success > 0) {
        toast.success(
          `${success} card${success === 1 ? "" : "s"} added to inventory`,
          failed > 0
            ? {
                description: `${failed} failed`,
              }
            : undefined,
        )
      }

      if (success === 0) {
        toast.error("Failed to add selected cards")

        return
      }

      onSuccess?.()
      onOpenChange(false)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex
          h-[calc(100dvh-1rem)]
          w-[calc(100vw-1rem)]
          max-w-none
          flex-col
          gap-0
          overflow-hidden
          p-0

          sm:h-[85vh]
          sm:min-h-[500px]
          sm:w-[92vw]
          sm:min-w-[700px]
          sm:max-w-[1500px]
          sm:resize

          lg:h-[80vh]
          lg:w-[85vw]

          xl:w-[78vw]
        "
      >
        {/* HEADER */}
        <DialogHeader
          className="
            shrink-0
            border-b
            bg-background
            px-4
            py-4
            sm:px-6
          "
        >
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Bulk Add to Inventory
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {rows.length} cards
            </span>
          </DialogTitle>

          <p className="hidden text-xs text-muted-foreground sm:block">
            Resize this window from the bottom-right corner.
          </p>
        </DialogHeader>

        {/* SCROLLABLE CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-4 p-3 sm:p-5">
            {/* BULK CONTROLS */}
            <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
              <div className="mb-3">
                <h3 className="font-semibold">Apply to Selected Cards</h3>

                <p className="text-xs text-muted-foreground">
                  Set defaults for every selected card, then override individual
                  cards below.
                </p>
              </div>

              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                  lg:grid-cols-3
                  xl:grid-cols-5
                "
              >
                {/* CONDITION */}
                <div className="space-y-2">
                  <Label>Condition</Label>

                  <Select
                    value={bulkCondition}
                    onValueChange={(value) =>
                      setBulkCondition(value as CardCondition)
                    }
                    disabled={isAdding}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {CARD_CONDITIONS.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={applyConditionToAll}
                    disabled={isAdding}
                  >
                    Apply to All
                  </Button>
                </div>

                {/* FINISH */}
                <div className="space-y-2">
                  <Label>Finish / Type</Label>

                  <Select
                    value={bulkFinish}
                    onValueChange={(value) =>
                      setBulkFinish(value as CardFinish | "auto")
                    }
                    disabled={isAdding}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="auto">Auto Detect</SelectItem>

                      {CARD_FINISHES.map((finish) => (
                        <SelectItem key={finish} value={finish}>
                          {finish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={applyFinishToAll}
                    disabled={isAdding}
                  >
                    Apply to All
                  </Button>
                </div>

                {/* LANGUAGE */}
                <div className="space-y-2">
                  <Label>Language</Label>

                  <Select
                    value={bulkLanguage}
                    onValueChange={(value) =>
                      setBulkLanguage(value as "en" | "ja")
                    }
                    disabled={isAdding}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>

                      <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={applyLanguageToAll}
                    disabled={isAdding}
                  >
                    Apply to All
                  </Button>
                </div>

                {/* QUANTITY */}
                <div className="space-y-2">
                  <Label>Quantity</Label>

                  <Input
                    type="number"
                    min="1"
                    value={bulkQuantity}
                    onChange={(event) => setBulkQuantity(event.target.value)}
                    disabled={isAdding}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={applyQuantityToAll}
                    disabled={isAdding}
                  >
                    Apply to All
                  </Button>
                </div>

                {/* TCG PRICING */}
                <div className="space-y-2">
                  <Label>TCGPlayer Pricing</Label>

                  <div className="flex h-10 items-center rounded-md border bg-background px-3 text-sm">
                    <DollarSign className="mr-1 h-4 w-4" />
                    Market Price
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={applyTCGPricesToAll}
                    disabled={isAdding}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Use TCG for All
                  </Button>
                </div>
              </div>
            </div>

            {/* CARD ROWS */}
            <div className="space-y-3">
              {rows.map((row) => {
                const tcgMarketPrice = getTCGMarketPriceForFinish(
                  row.card,
                  row.finish,
                )

                const tcgPriceLabel = getTCGPriceTypeLabel(row.card, row.finish)

                return (
                  <div
                    key={row.card.id}
                    className="
                      rounded-xl
                      border
                      bg-card
                      p-3
                      shadow-sm
                    "
                  >
                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-4

                        sm:grid-cols-[72px_minmax(150px,1fr)]

                        lg:grid-cols-[72px_minmax(140px,1fr)_160px_180px_90px_minmax(180px,230px)]
                        lg:items-center
                      "
                    >
                      {/* CARD IMAGE */}
                      <div className="flex justify-center sm:block">
                        <img
                          src={row.card.images.small}
                          alt={row.card.name}
                          className="
                            h-24
                            w-[68px]
                            rounded-md
                            object-cover
                            shadow-sm
                          "
                        />
                      </div>

                      {/* CARD INFORMATION */}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {row.card.name}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          #{row.card.number}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.card.set.name}
                        </p>

                        {tcgMarketPrice !== null && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {tcgPriceLabel}
                            </p>

                            <p className="font-semibold text-primary">
                              ${tcgMarketPrice.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* CONDITION */}
                      <div className="space-y-1">
                        <Label className="text-xs lg:hidden">Condition</Label>

                        <Select
                          value={row.condition}
                          onValueChange={(value) =>
                            updateRow(row.card.id, {
                              condition: value as CardCondition,
                            })
                          }
                          disabled={isAdding}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {CARD_CONDITIONS.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {condition}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* FINISH */}
                      <div className="space-y-1">
                        <Label className="text-xs lg:hidden">Finish</Label>

                        <Select
                          value={row.finish}
                          onValueChange={(value) =>
                            updateRowFinish(row.card.id, value as CardFinish)
                          }
                          disabled={isAdding}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            {CARD_FINISHES.map((finish) => (
                              <SelectItem key={finish} value={finish}>
                                {finish}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* QUANTITY */}
                      <div className="space-y-1">
                        <Label className="text-xs lg:hidden">Qty</Label>

                        <Input
                          type="number"
                          min="1"
                          value={row.quantity}
                          disabled={isAdding}
                          onChange={(event) => {
                            const quantity = Number.parseInt(
                              event.target.value,
                              10,
                            )

                            updateRow(row.card.id, {
                              quantity:
                                Number.isFinite(quantity) && quantity > 0
                                  ? quantity
                                  : 1,
                            })
                          }}
                        />
                      </div>

                      {/* PRICE */}
                      <div className="space-y-2">
                        <Label className="text-xs lg:hidden">
                          Inventory Price
                        </Label>

                        <div className="flex gap-2">
                          <div className="relative min-w-0 flex-1">
                            <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={row.price}
                              className="pl-7"
                              disabled={isAdding}
                              onChange={(event) => {
                                const price = Number.parseFloat(
                                  event.target.value,
                                )

                                updateRow(row.card.id, {
                                  price: Number.isFinite(price) ? price : 0,
                                })
                              }}
                            />
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            disabled={isAdding || tcgMarketPrice === null}
                            onClick={() => updateSingleTCGPrice(row.card.id)}
                          >
                            TCG
                          </Button>
                        </div>

                        {tcgMarketPrice !== null && (
                          <button
                            type="button"
                            className="text-left text-xs text-primary hover:underline"
                            disabled={isAdding}
                            onClick={() => updateSingleTCGPrice(row.card.id)}
                          >
                            Use ${tcgMarketPrice.toFixed(2)} {tcgPriceLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div
          className="
            shrink-0
            border-t
            bg-background
            p-3
            sm:px-5
            sm:py-4
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3

              sm:flex-row
              sm:items-center
            "
          >
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cards</p>

                <p className="font-semibold">{rows.length}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>

                <p className="font-semibold">{totalQuantity}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Value</p>

                <p className="font-semibold text-primary">
                  ${totalInventoryValue.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={handleAddAll}
                disabled={isAdding || rows.length === 0}
              >
                <PackagePlus className="mr-2 h-4 w-4" />

                {isAdding ? "Adding..." : `Add ${rows.length} to Inventory`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
