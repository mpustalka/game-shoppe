import Link from "next/link"
import type { PokemonSet } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Layers } from "lucide-react"

interface SetGridProps {
  sets: PokemonSet[]
}

export function SetGrid({ sets }: SetGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {sets.map((set) => (
        <SetCard key={set.id} set={set} />
      ))}
    </div>
  )
}

function SetCard({ set }: { set: PokemonSet }) {
  const releaseDate = new Date(set.releaseDate)
  const formattedDate = releaseDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })

  return (
    <Link href={`/sets/${set.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex flex-col items-center p-4">
          {/* Set Logo */}
          <div className="relative mb-3 flex h-20 w-full items-center justify-center">
            {set.images.logo ? (
              <img
                src={set.images.logo}
                alt={`${set.name} logo`}
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                <Layers className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Set Symbol */}
          {set.images.symbol && (
            <img
              src={set.images.symbol}
              alt={`${set.name} symbol`}
              className="mb-2 h-6 w-6"
            />
          )}

          {/* Set Name */}
          <h3 className="mb-2 text-center text-sm font-medium leading-tight text-foreground">
            {set.name}
          </h3>

          {/* Metadata */}
          <div className="mt-auto flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Layers className="mr-1 h-3 w-3" />
              {set.total} cards
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Calendar className="mr-1 h-3 w-3" />
              {formattedDate}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
