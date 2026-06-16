import { getAllJapaneseSets } from "@/lib/japanese-tcg"
import { SetGrid } from "@/components/cards/set-grid"

export const metadata = {
  title: "Browse Japanese Only Pokemon Sets - Card Vault",
  description: "Browse all Pokemon TCG sets and add cards to your inventory",
}

export default async function SetsPage() {
  const sets = await getAllJapaneseSets()

  const setsBySeries = sets.reduce(
    (acc, set) => {
      if (!acc[set.series]) {
        acc[set.series] = []
      }
      acc[set.series].push(set)
      return acc
    },
    {} as Record<string, typeof sets>,
  )

  const sortedSeries = Object.entries(setsBySeries)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Japanese Pokemon TCG Sets
        </h1>

        <p className="mt-2 text-muted-foreground">
          Browse {sets.length} Japanese Pokemon sets and add cards to your
          inventory.
        </p>
      </div>

      <div className="space-y-12">
        {sortedSeries.map(([series, seriesSets]) => (
          <section key={series}>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {series}
            </h2>
            <SetGrid sets={seriesSets} basePath="/japanese-sets" />
          </section>
        ))}
      </div>
    </div>
  )
}
