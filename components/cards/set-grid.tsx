"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import type { PokemonSet } from "@/lib/types"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import {
  Calendar,
  CheckCircle2,
  Layers,
} from "lucide-react"

interface SetGridProps {
  sets: PokemonSet[]
  basePath?: string
}

type OwnershipResponse = {
  bySet?: Record<string, number>
}

type OwnershipCacheEntry = {
  data: Record<string, number>
  expiresAt: number
}

const OWNERSHIP_CACHE_TTL_MS = 15_000

const ownershipCache = new Map<
  string,
  OwnershipCacheEntry
>()

const ownershipRequests = new Map<
  string,
  Promise<Record<string, number>>
>()

function languageForBasePath(
  basePath: string,
) {
  if (
    basePath.startsWith(
      "/japanese-sets",
    )
  ) {
    return "ja"
  }

  if (
    basePath.startsWith(
      "/chinese-sets",
    )
  ) {
    return "zh"
  }

  return "en"
}

/**
 * Never allow malformed IDs to become routes such as:
 *
 * /sets/undefined
 * /sets/null
 * /sets/
 */
function normalizeSetId(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null
  }

  const id = value.trim()

  if (!id) {
    return null
  }

  const lower =
    id.toLowerCase()

  if (
    lower === "undefined" ||
    lower === "null" ||
    lower === "nan"
  ) {
    return null
  }

  return id
}

function normalizeBasePath(
  value: string,
) {
  const trimmed =
    value.trim()

  if (!trimmed) {
    return "/sets"
  }

  return trimmed.endsWith("/")
    ? trimmed.slice(0, -1)
    : trimmed
}

async function fetchOwnership(
  language: string,
): Promise<Record<string, number>> {
  const now = Date.now()

  const cached =
    ownershipCache.get(
      language,
    )

  if (
    cached &&
    cached.expiresAt > now
  ) {
    return cached.data
  }

  const existingRequest =
    ownershipRequests.get(
      language,
    )

  if (existingRequest) {
    return existingRequest
  }

  const request =
    (async () => {
      const params =
        new URLSearchParams({
          language,
        })

      const response =
        await fetch(
          `/api/inventory/ownership?${params.toString()}`,
          {
            cache: "no-store",
          },
        )

      if (
        response.status ===
        401
      ) {
        return {}
      }

      if (!response.ok) {
        throw new Error(
          `Ownership request failed with ${response.status}`,
        )
      }

      const data =
        (await response.json()) as OwnershipResponse

      const bySet =
        data.bySet &&
        typeof data.bySet ===
          "object"
          ? data.bySet
          : {}

      ownershipCache.set(
        language,
        {
          data: bySet,

          expiresAt:
            Date.now() +
            OWNERSHIP_CACHE_TTL_MS,
        },
      )

      return bySet
    })()

  ownershipRequests.set(
    language,
    request,
  )

  try {
    return await request
  } finally {
    ownershipRequests.delete(
      language,
    )
  }
}

export function SetGrid({
  sets,
  basePath = "/sets",
}: SetGridProps) {
  const [
    ownedBySet,
    setOwnedBySet,
  ] = useState<
    Record<string, number>
  >({})

  const normalizedBasePath =
    useMemo(
      () =>
        normalizeBasePath(
          basePath,
        ),
      [basePath],
    )

  const language =
    useMemo(
      () =>
        languageForBasePath(
          normalizedBasePath,
        ),
      [normalizedBasePath],
    )

  /**
   * Sanitize everything BEFORE rendering links.
   *
   * A malformed upstream set must never create
   * /sets/undefined.
   */
  const validSets =
    useMemo(() => {
      if (
        !Array.isArray(sets)
      ) {
        return []
      }

      const valid: PokemonSet[] =
        []

      const seen =
        new Set<string>()

      for (
        const set of sets
      ) {
        if (
          !set ||
          typeof set !==
            "object"
        ) {
          console.error(
            "SetGrid received invalid set:",
            set,
          )

          continue
        }

        const setId =
          normalizeSetId(
            set.id,
          )

        if (!setId) {
          console.error(
            "SetGrid blocked a set with an invalid ID:",
            {
              name:
                set.name,
              id: set.id,
            },
          )

          continue
        }

        /**
         * Prevent accidental duplicate cards/links
         * if the upstream catalog contains the same
         * set more than once.
         */
        if (
          seen.has(setId)
        ) {
          continue
        }

        seen.add(setId)

        valid.push(set)
      }

      return valid
    }, [sets])

  useEffect(() => {
    let cancelled = false

    async function loadOwnership() {
      try {
        const bySet =
          await fetchOwnership(
            language,
          )

        if (!cancelled) {
          setOwnedBySet(
            bySet,
          )
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to load set ownership:",
            error,
          )
        }
      }
    }

    void loadOwnership()

    return () => {
      cancelled = true
    }
  }, [language])

  if (
    validSets.length === 0
  ) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-12 text-center">
        <Layers className="mx-auto h-10 w-10 text-muted-foreground" />

        <h3 className="mt-4 text-base font-semibold">
          No sets available
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Set information
          could not be loaded
          right now. Please
          try again shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {validSets.map(
        (set) => {
          const setId =
            normalizeSetId(
              set.id,
            )

          /**
           * This should be impossible because validSets
           * already filtered invalid IDs, but keeping the
           * guard here means SetCard can NEVER receive an
           * invalid route ID.
           */
          if (!setId) {
            return null
          }

          return (
            <SetCard
              key={setId}
              set={set}
              setId={setId}
              basePath={
                normalizedBasePath
              }
              ownedCount={
                ownedBySet[
                  setId
                ] ?? 0
              }
            />
          )
        },
      )}
    </div>
  )
}

function SetCard({
  set,
  setId,
  basePath,
  ownedCount,
}: {
  set: PokemonSet
  setId: string
  basePath: string
  ownedCount: number
}) {
  const releaseDate =
    set.releaseDate
      ? new Date(
          set.releaseDate,
        )
      : null

  const formattedDate =
    releaseDate &&
    !Number.isNaN(
      releaseDate.getTime(),
    )
      ? releaseDate.toLocaleDateString(
          "en-US",
          {
            month: "short",
            year: "numeric",
          },
        )
      : "Unknown"

  const total =
    typeof set.total ===
      "number" &&
    Number.isFinite(
      set.total,
    )
      ? Math.max(
          0,
          set.total,
        )
      : 0

  const safeOwnedCount =
    Number.isFinite(
      ownedCount,
    )
      ? Math.max(
          0,
          ownedCount,
        )
      : 0

  const completionPercent =
    total > 0
      ? Math.min(
          100,
          (safeOwnedCount /
            total) *
            100,
        )
      : 0

  const href =
    `${basePath}/${encodeURIComponent(
      setId,
    )}`

  const logo =
    set.images?.logo

  const symbol =
    set.images?.symbol

  return (
    <Link
      href={href}
      prefetch={false}
      className="block h-full"
    >
      <Card className="group h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex h-full flex-col items-center p-4">
          <div className="relative mb-3 flex h-20 w-full items-center justify-center">
            {logo ? (
              <img
                src={logo}
                alt={`${set.name} logo`}
                loading="lazy"
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
              />
            ) : symbol ? (
              <img
                src={symbol}
                alt={`${set.name} symbol`}
                loading="lazy"
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                <Layers className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          <h3 className="mb-2 text-center text-sm font-medium leading-tight text-foreground">
            {set.name ||
              "Pokémon Set"}
          </h3>

          <div className="mt-auto flex flex-wrap items-center justify-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs"
            >
              <Layers className="mr-1 h-3 w-3" />

              {total} cards
            </Badge>

            <Badge
              variant="outline"
              className="text-xs"
            >
              <Calendar className="mr-1 h-3 w-3" />

              {formattedDate}
            </Badge>
          </div>

          {safeOwnedCount >
            0 && (
            <div className="mt-3 w-full">
              <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />

                <span>
                  {
                    safeOwnedCount
                  }
                  /{total} owned
                  {" · "}
                  {completionPercent.toFixed(
                    0,
                  )}
                  %
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${completionPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}