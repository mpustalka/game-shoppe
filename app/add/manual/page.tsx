"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useInventory } from "@/lib/inventory-context"
import { CARD_CONDITIONS, CARD_PRINT_FINISHES, type CardCondition, type CardPrintFinish, type ManualCardData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Upload, 
  ImageIcon, 
  X, 
  CheckCircle2,
  Package
} from "lucide-react"
import Link from "next/link"

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
  "Rare Holo",
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

export default function ManualAddCardPage() {
  const router = useRouter()
  const { addManualItem } = useInventory()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<ManualCardData>({
    name: "",
    setName: "",
    number: "",
    rarity: "",
    condition: "Near Mint",
    printFinish: "Normal",
    price: 0,
    quantity: 1,
    quantitySold: 0,
    notes: "",
    customImage: "",
  })
  
  const [customSet, setCustomSet] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setImagePreview(base64)
      setFormData(prev => ({ ...prev, customImage: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, customImage: "" }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert("Please enter a card name")
      return
    }
    
    const setName = formData.setName === "Custom / Other" ? customSet : formData.setName
    if (!setName.trim()) {
      alert("Please select or enter a set name")
      return
    }

    setIsSubmitting(true)

    try {
      const item = await addManualItem({
        ...formData,
        setName,
      })
      if (!item) {
        alert("Failed to add card. Please try again.")
        return
      }
      setSuccess(true)
      setTimeout(() => {
        setFormData({
          name: "",
          setName: "",
          number: "",
          rarity: "",
          condition: "Near Mint",
          printFinish: "Normal",
          price: 0,
          quantity: 1,
          quantitySold: 0,
          notes: "",
          customImage: "",
        })
        setCustomSet("")
        setImagePreview(null)
        setSuccess(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to add card:", error)
      alert("Failed to add card. Please try again.")
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Add Card Manually</h1>
          <p className="mt-1 text-muted-foreground">
            Enter card details manually for cards not in the database
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
          {/* Left Column - Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Card Image</CardTitle>
              <CardDescription>Upload a photo of the card (optional)</CardDescription>
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
                      className="absolute -top-2 -right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex aspect-[2.5/3.5] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">Click to upload image</p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
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

          {/* Right Column - Card Details */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setName">Pokemon Set *</Label>
                  <Select
                    value={formData.setName}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, setName: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a set" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SETS.map((set) => (
                        <SelectItem key={set} value={set}>{set}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.setName === "Custom / Other" && (
                    <Input
                      placeholder="Enter custom set name"
                      value={customSet}
                      onChange={(e) => setCustomSet(e.target.value)}
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
                      value={formData.number}
                      onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rarity">Rarity</Label>
                    <Select
                      value={formData.rarity}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, rarity: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        {RARITIES.map((rarity) => (
                          <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Details</CardTitle>
                <CardDescription>Set pricing and stock information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="printFinish">Print Finish *</Label>
                  <Select
                    value={formData.printFinish}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, printFinish: v as CardPrintFinish }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_PRINT_FINISHES.map((finish) => (
                        <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, condition: v as CardCondition }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantitySold">Quantity Sold</Label>
                    <Input
                      id="quantitySold"
                      type="number"
                      min="0"
                      value={formData.quantitySold}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantitySold: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about this card..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" type="button" asChild>
            <Link href="/add">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Package className="mr-2 h-4 w-4 animate-pulse" />
                Adding...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Add to Inventory
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
