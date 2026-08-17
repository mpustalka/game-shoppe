"use client"

import { useRef, useState } from "react"
import Link from "next/link"

import { useInventory } from "@/lib/inventory-context"

import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  type CardCondition,
  type CardFinish,
  type ManualCardData,
} from "@/lib/types"

import { FeatureGate } from "@/components/billing/trial-banner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ArrowLeft,
  Upload,
  ImageIcon,
  X,
  CheckCircle2,
  Package,
} from "lucide-react"

// Common Pokemon sets for quick selection
const COMMON_SETS = [
  "Scarlet & Violet",
  "Paldea Evolved",
  "Obsidian Flames",
  "151",
  "Paradox Rift",
  "Paldean Fates",
  "Temporal Forces",
  "Twilight Masquerade",
  "Shrouded Fable",
  "Stellar Crown",
  "Surging Sparks",
  "Prismatic Evolutions",
  "Journey Together",
  "Perfect Order",
  "Crown Zenith",
  "Silver Tempest",
  "Lost Origin",
  "Astral Radiance",
  "Brilliant Stars",
  "Fusion Strike",
  "Evolving Skies",
  "Chilling Reign",
  "Battle Styles",
  "Shining Fates",
  "Vivid Voltage",
  "Champion's Path",
  "Custom / Other",
]

const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Common Reverse Holo",
  "Uncommon Reverse Holo",
  "Rare Reverse Holo",
  "Rare Holo",
  "Rare Holo EX",
  "EX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Ultra",
  "Rare Secret",
  "Special Art Rare",
  "Illustration Rare",
  "Hyper Rare",
  "Promo",
]

function getEmptyFormData(): ManualCardData {
  return {
    name: "",
    setName: "",
    number: "",
    rarity: "",

    // Required by ManualCardData
    language: "en",

    condition: "Near Mint",
    finish: "Normal",

    price: 0,
    quantity: 1,
    quantitySold: 0,

    notes: "",
    customImage: "",
  }
}

export default function ManualAddCardPage() {
  return (
    <FeatureGate
      allowed={(e) => e.canAddCards}
      title="Active subscription required"
      description="Manual card entry is included with both Basic and Premium. Choose a plan to continue adding cards to your inventory."
    >
      <ManualAddCardPageInner />
    </FeatureGate>
  )
}

function ManualAddCardPageInner() {
  const { addManualItem } = useInventory()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ManualCardData>(getEmptyFormData())

  const [customSet, setCustomSet] = useState("")

  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [success, setSuccess] = useState(false)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB")
      return
    }

    const reader = new FileReader()

    reader.onloadend = () => {
      const base64 = reader.result as string

      setImagePreview(base64)

      setFormData((prev) => ({
        ...prev,
        customImage: base64,
      }))
    }

    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)

    setFormData((prev) => ({
      ...prev,
      customImage: "",
    }))

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      alert("Please enter a card name")
      return
    }

    const setName =
      formData.setName === "Custom / Other" ? customSet : formData.setName

    if (!setName.trim()) {
      alert("Please select or enter a set name")
      return
    }

    if (!Number.isFinite(formData.price) || formData.price <= 0) {
      alert("Please enter a valid price")
      return
    }

    if (!Number.isFinite(formData.quantity) || formData.quantity <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    setIsSubmitting(true)

    try {
      const addedItem = await addManualItem({
        ...formData,
        setName: setName.trim(),
      })

      // addManualItem returns null when the API rejects the write.
      if (!addedItem) {
        throw new Error("Failed to add card to inventory")
      }

      setSuccess(true)

      setFormData(getEmptyFormData())

      setCustomSet("")
      setImagePreview(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      window.setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to add card:", error)

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add card. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/add">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Add Card Manually
          </h1>

          <p className="mt-1 text-muted-foreground">
            Enter card details manually for cards not in the database.
          </p>
        </div>
      </div>

      {success && (
        <Card className="mb-6 border-green-500 bg-green-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />

            <p className="font-medium text-green-700 dark:text-green-400">
              Card added to inventory successfully!
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT COLUMN */}
          <Card>
            <CardHeader>
              <CardTitle>Card Image</CardTitle>

              <CardDescription>
                Upload a photo of the card (optional)
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-border bg-muted">
                      <img
                        src={imagePreview}
                        alt="Card preview"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex aspect-[2.5/3.5] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/50" />

                    <p className="text-sm font-medium text-foreground">
                      Click to upload image
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG up to 5MB
                    </p>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {!imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Card Details</CardTitle>

                <CardDescription>Enter the card information</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Card Name *</Label>

                  <Input
                    id="name"
                    placeholder="e.g., Charizard ex"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setName">Pokémon Set *</Label>

                  <Select
                    value={formData.setName}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        setName: value,
                      }))
                    }
                  >
                    <SelectTrigger id="setName">
                      <SelectValue placeholder="Select a set" />
                    </SelectTrigger>

                    <SelectContent>
                      {COMMON_SETS.map((set) => (
                        <SelectItem key={set} value={set}>
                          {set}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.setName === "Custom / Other" && (
                    <Input
                      placeholder="Enter custom set name"
                      value={customSet}
                      onChange={(event) => setCustomSet(event.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number">Card Number</Label>

                    <Input
                      id="number"
                      placeholder="e.g., 006/165"
                      value={formData.number ?? ""}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          number: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rarity">Rarity</Label>

                    <Select
                      value={formData.rarity ?? ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          rarity: value,
                        }))
                      }
                    >
                      <SelectTrigger id="rarity">
                        <SelectValue placeholder="Select rarity" />
                      </SelectTrigger>

                      <SelectContent>
                        {RARITIES.map((rarity) => (
                          <SelectItem key={rarity} value={rarity}>
                            {rarity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>

                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        language: value as "en" | "ja",
                      }))
                    }
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>

                      <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Details</CardTitle>

                <CardDescription>
                  Set pricing and stock information
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>

                  <Select
                    value={formData.condition}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        condition: value as CardCondition,
                      }))
                    }
                  >
                    <SelectTrigger id="condition">
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

                <div className="space-y-2">
                  <Label htmlFor="finish">Finish / Type *</Label>

                  <Select
                    value={formData.finish}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        finish: value as CardFinish,
                      }))
                    }
                  >
                    <SelectTrigger id="finish">
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

                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>

                  <Input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price || ""}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: Number.parseFloat(event.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity Available *</Label>

                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity:
                            Number.parseInt(event.target.value, 10) || 1,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantitySold">Quantity Sold</Label>

                    <Input
                      id="quantitySold"
                      type="number"
                      min="0"
                      value={formData.quantitySold ?? 0}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantitySold:
                            Number.parseInt(event.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>

                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about this card..."
                    value={formData.notes ?? ""}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" type="button" asChild>
            <Link href="/add">Cancel</Link>
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            <Package
              className={
                isSubmitting ? "mr-2 h-4 w-4 animate-pulse" : "mr-2 h-4 w-4"
              }
            />

            {isSubmitting ? "Adding..." : "Add to Inventory"}
          </Button>
        </div>
      </form>
    </div>
  )
}