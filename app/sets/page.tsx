import Link from "next/link"
import {
  ArrowLeft,
  Database,
  Layers,
  RefreshCw,
} from "lucide-react"

import { getAllCatalogSets } from "@/lib/pokemon-catalog-server"
import { SetGrid } from "@/components/cards/set-grid"
import { Button } from "@/components/ui/button"

/*
 * The catalog now comes from our own Supabase database.
 *
 * The external Pokemon API is NOT contacted by this page.
 */
export const revalidate = 3600

export default async function SetsPage() {
  const sets =
    await getAllCatalogSets()

  if (
    sets.length === 0
  ) {
    return (
      <SetsTemporarilyUnavailable />
    )
  }

  /*
   * Group sets by series.
   */
  const setsBySeries =
    sets.reduce<
      Record<
        string,
        typeof sets
      >
    >(
      (
        groups,
        set,
      ) => {
        const series =
          typeof set.series ===
            "string" &&
          set.series.trim()
            ? set.series.trim()
            : "Other"

        if (
          !groups[series]
        ) {
          groups[series] = []
        }

        groups[
          series
        ].push(set)

        return groups
      },
      {},
    )

  /*
   * Sort every series newest -> oldest.
   */
  for (
    const seriesSets of
      Object.values(
        setsBySeries,
      )
  ) {
    seriesSets.sort(
      (a, b) =>
        getReleaseTime(
          b.releaseDate,
        ) -
        getReleaseTime(
          a.releaseDate,
        ),
    )
  }

  /*
   * Sort series according to their newest release.
   */
  const sortedSeries =
    Object.entries(
      setsBySeries,
    ).sort(
      (
        [, setsA],
        [, setsB],
      ) => {
        const newestA =
          Math.max(
            ...setsA.map(
              (set) =>
                getReleaseTime(
                  set.releaseDate,
                ),
            ),
          )

        const newestB =
          Math.max(
            ...setsB.map(
              (set) =>
                getReleaseTime(
                  set.releaseDate,
                ),
            ),
          )

        return (
          newestB -
          newestA
        )
      },
    )

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070708] text-white">
      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(225,29,72,.18),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(127,29,29,.12),transparent_30%)]" />

        <div className="relative mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-11 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">
                <Layers className="h-3.5 w-3.5" />
                Pokémon TCG
              </div>

              <h1 className="max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                English Pokémon Sets
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                Browse Pokémon TCG sets,
                view every card, track your
                collection, and add cards
                directly to your inventory
                and binders.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-300/60">
                <Database className="h-3.5 w-3.5" />
                Card catalog loaded from Card Vault
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
                  Sets
                </div>

                <div className="mt-1 text-2xl font-black">
                  {sets.length}
                </div>
              </div>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/10 bg-white/[0.035] text-white hover:bg-white/[0.07]"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SET SERIES
      ====================================================== */}

      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="space-y-12">
          {sortedSeries.map(
            ([
              series,
              seriesSets,
            ]) => (
              <section
                key={series}
              >
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-[-0.03em]">
                      {series}
                    </h2>

                    <p className="mt-1 text-sm text-white/35">
                      {
                        seriesSets.length
                      }{" "}
                      {seriesSets.length ===
                      1
                        ? "set"
                        : "sets"}
                    </p>
                  </div>

                  {seriesSets[0]
                    ?.releaseDate && (
                    <div className="text-xs font-medium text-white/30">
                      Latest
                      release:{" "}
                      {formatReleaseDate(
                        seriesSets[0]
                          .releaseDate,
                      )}
                    </div>
                  )}
                </div>

                <SetGrid
                  sets={
                    seriesSets
                  }
                  basePath="/sets"
                />
              </section>
            ),
          )}
        </div>
      </div>
    </main>
  )
}

/* =========================================================
 * HELPERS
 * ======================================================= */

function getReleaseTime(
  releaseDate?:
    | string
    | null,
) {
  if (!releaseDate) {
    return 0
  }

  const time =
    new Date(
      releaseDate,
    ).getTime()

  return Number.isNaN(
    time,
  )
    ? 0
    : time
}

function formatReleaseDate(
  releaseDate?:
    | string
    | null,
) {
  if (!releaseDate) {
    return "Unknown"
  }

  const date =
    new Date(
      releaseDate,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown"
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      year: "numeric",
    },
  )
}

/* =========================================================
 * DATABASE ERROR STATE
 * ======================================================= */

function SetsTemporarilyUnavailable() {
  return (
    <main className="min-h-screen bg-[#070708] px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-[28px] border border-amber-400/15 bg-white/[0.035] p-8 text-center sm:p-12">
        <RefreshCw className="mx-auto h-12 w-12 text-amber-400" />

        <h1 className="mt-5 text-2xl font-black sm:text-3xl">
          Pokémon sets are temporarily unavailable
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/45">
          The Pokémon catalog could not
          be loaded right now. Your
          inventory, binders, and
          collection data are not
          affected.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="rounded-xl bg-rose-600 hover:bg-rose-500"
          >
            <Link href="/sets">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-xl border-white/10 bg-white/[0.04] text-white"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}