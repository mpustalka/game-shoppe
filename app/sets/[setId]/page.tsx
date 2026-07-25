import { notFound } from "next/navigation"
import Link from "next/link"
import { getSetById, getAllCardsBySet } from "@/lib/pokemon-tcg"
import { CardGrid } from "@/components/cards/card-grid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Layers } from "lucide-react"

interface SetDetailPageProps {
  params: Promise<{ setId: string }>
}

export async function generateMetadata({ params }: SetDetailPageProps) {
  const { setId } = await params
  const set = await getSetById(setId)

  if (!set) {
    return { title: "Set Not Found - Card Vault" }
  }

  return {
    title: `${set.name} - Card Vault`,
    description: `Browse and add ${set.total} cards from ${set.name} to your inventory`,
  }
}

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { setId } = await params

  const [set, cards] = await Promise.all([
    getSetById(setId),
    getAllCardsBySet(setId),
  ])

  if (!set) {
    notFound()
  }

  const releaseDate = set.releaseDate ? new Date(set.releaseDate) : null
  const formattedDate =
    releaseDate && !Number.isNaN(releaseDate.getTime())
      ? releaseDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Unknown"


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/sets">
          <Link href="/japanese-sets">Japanese Sets</Link>
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Sets
        </Link>
      </Button>

      {/* Set Header */}
      <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {/* Set Logo */}
        <div className="flex h-24 w-48 items-center justify-center">
          {set.images.logo ? (
            <img
              src={set.images.logo}
              alt={`${set.name} logo`}
              className="max-h-full max-w-full object-contain"
            />
          ) : set.images.symbol ? (
            <img
              src={set.images.symbol}
              alt={`${set.name} symbol`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
              <Layers className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            {set.images.symbol && (
              <img src={set.images.symbol} alt="" className="h-8 w-8" />
            )}
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {set.name}
            </h1>
          </div>
          <p className="mt-1 text-lg text-muted-foreground">{set.series}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Layers className="mr-1 h-3.5 w-3.5" />
              {set.total} cards
            </Badge>
            <Badge variant="outline">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              Released {formattedDate}
            </Badge>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Card list coming soon
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {set.name} is a brand-new release. Individual cards will appear here
            automatically as soon as they&apos;re published. You can already add
            cards manually from the Add Card page.
          </p>
        </div>
      ) : (
        <CardGrid cards={cards} setId={setId} language="en" />
      )}
    </div>
  )
}
