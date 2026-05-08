"use client"

import { useState } from "react"
import Link from "next/link"
import { searchCards } from "@/lib/pokemon-tcg"
import type { PokemonCard } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CardDetailModal } from "@/components/cards/card-detail-modal"
import { 
  Search, 
  Loader2, 
  Package, 
  PenSquare, 
  Upload as UploadIcon,
  Database
} from "lucide-react"

export default function AddCardPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PokemonCard[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const { cards } = await searchCards(query.trim(), 1, 30)
      setResults(cards)
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleCardClick = (card: PokemonCard) => {
    setSelectedCard(card)
    setModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Add Card to Inventory</h1>
        <p className="mt-2 text-muted-foreground">
          Search the Pokemon TCG database or add cards manually
        </p>
      </div>

      {/* Add Method Options */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Search Database
            </CardTitle>
            <CardDescription>
              Find cards from the official Pokemon TCG database with auto-filled info
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Search below to find cards with images, prices, and set info pre-filled.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-primary" />
              Manual Entry
            </CardTitle>
            <CardDescription>
              Add cards manually with custom images and details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Perfect for promos, foreign cards, or items not in the database.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/add/manual">Add Manually</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="h-5 w-5 text-primary" />
              Bulk Import
            </CardTitle>
            <CardDescription>
              Import multiple cards from CSV or Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a spreadsheet to add many cards at once.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/import">Import Cards</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Pokemon TCG Database</CardTitle>
          <CardDescription>
            Search for a card by name to add it to your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by card name (e.g., Charizard, Pikachu VMAX)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" disabled={isSearching || !query.trim()}>
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {isSearching ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium">No cards found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try a different search term or add the card manually
          </p>
          <Button variant="outline" asChild>
            <Link href="/add/manual">Add Card Manually</Link>
          </Button>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Found {results.length} cards. Click a card to add it to your inventory.
          </p>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((card) => (
              <Card
                key={card.id}
                className="group cursor-pointer overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                onClick={() => handleCardClick(card)}
              >
                <CardContent className="p-2">
                  <div className="relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-muted">
                    <img
                      src={card.images.small}
                      alt={card.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <h3 className="truncate text-sm font-medium leading-tight text-foreground">
                      {card.name}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {card.set.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-medium">Search for a card</h3>
          <p className="text-center text-sm text-muted-foreground">
            Enter a card name above to search the Pokemon TCG database
          </p>
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
