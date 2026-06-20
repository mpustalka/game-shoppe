import { getAllSets } from "@/lib/pokemon-tcg"
import { SetGrid } from "@/components/cards/set-grid"

// The sets list is fetched from the external Pokemon TCG API, which is not
// guaranteed to be reachable at build time. Render at request time so a
// transient upstream error can't crash static generation.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Browse Pokemon Sets - Card Vault",
  description: "Browse all Pokemon TCG sets and add cards to your inventory",
}

export default async function SetsPage() {
  const sets = await getAllSets()
  
  // Group sets by series
  const setsBySeries = sets.reduce((acc, set) => {
    if (!acc[set.series]) {
      acc[set.series] = []
    }
    acc[set.series].push(set)
    return acc
  }, {} as Record<string, typeof sets>)

  // Sort series by most recent release date
  const sortedSeries = Object.entries(setsBySeries).sort((a, b) => {
    const aDate = new Date(a[1][0].releaseDate)
    const bDate = new Date(b[1][0].releaseDate)
    return bDate.getTime() - aDate.getTime()
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pokemon TCG Sets</h1>
        <p className="mt-2 text-muted-foreground">
          Browse {sets.length} sets from all Pokemon TCG series. Click a set to view and add cards to your inventory.
        </p>
      </div>

      <div className="space-y-12">
        {sortedSeries.map(([series, seriesSets]) => (
          <section key={series}>
            <h2 className="mb-4 text-xl font-semibold text-foreground">{series}</h2>
            <SetGrid sets={seriesSets} />
          </section>
        ))}
      </div>
    </div>
  )
}
