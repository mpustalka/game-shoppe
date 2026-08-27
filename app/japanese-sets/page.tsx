import { getAllJapaneseSets } from "@/lib/japanese-tcg"
import { SetGrid } from "@/components/cards/set-grid"
import { Badge } from "@/components/ui/badge"
import { Globe2, Layers3, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Japanese Pokemon Sets - Team Rocket Markets",
  description:
    "Browse Japanese Pokemon TCG sets and add cards to your Team Rocket Markets collection.",
}

export default async function JapaneseSetsPage() {
  const sets = await getAllJapaneseSets()

  const setsBySeries = sets.reduce(
    (acc, set) => {
      if (!acc[set.series]) acc[set.series] = []
      acc[set.series].push(set)
      return acc
    },
    {} as Record<string, typeof sets>,
  )

  const sortedSeries = Object.entries(setsBySeries)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(225,29,72,.20),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(127,29,29,.13),transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto max-w-[1500px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <Badge className="border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/10">
            <Globe2 className="mr-1.5 h-3.5 w-3.5" />
            Japanese Collection
          </Badge>

          <div className="mt-5 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Japanese Pokémon
                <span className="block bg-gradient-to-r from-rose-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                  TCG Sets
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/48 sm:text-base sm:leading-7">
                Explore {sets.length.toLocaleString()} Japanese releases across{" "}
                {sortedSeries.length.toLocaleString()} series and add cards
                directly to the same collection you use for English releases.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <Stat label="Sets" value={sets.length} />
              <Stat label="Series" value={sortedSeries.length} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] space-y-14 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {sortedSeries.map(([series, seriesSets], index) => (
          <section
            key={series}
            className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.025] sm:rounded-[30px]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045]">
                  {index === 0 ? (
                    <Sparkles className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Layers3 className="h-4 w-4 text-white/45" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black tracking-[-0.02em] sm:text-xl">
                    {series}
                  </h2>
                  <p className="text-xs text-white/35">
                    {seriesSets.length}{" "}
                    {seriesSets.length === 1 ? "set" : "sets"}
                  </p>
                </div>
              </div>

              {index === 0 && (
                <Badge
                  variant="outline"
                  className="hidden border-rose-400/20 bg-rose-500/10 text-rose-300 sm:flex"
                >
                  Latest releases
                </Badge>
              )}
            </div>

            <div className="p-3 sm:p-5 lg:p-6">
              <SetGrid
                sets={seriesSets}
                basePath="/japanese-sets"
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="min-w-[112px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">
        {value.toLocaleString()}
      </p>
    </div>
  )
}