"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { PokemonSet } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, Layers } from "lucide-react"

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

const ownershipCache = new Map<string, OwnershipCacheEntry>()
const ownershipRequests = new Map<
  string,
  Promise<Record<string, number>>
>()

function languageForBasePath(basePath: string) {
  if (basePath.startsWith("/japanese-sets")) return "ja"
  if (basePath.startsWith("/chinese-sets")) return "zh"
  return "en"
}

async function fetchOwnership(
  language: string,
): Promise<Record<string, number>> {
  const now = Date.now()
  const cached = ownershipCache.get(language)

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const existingRequest = ownershipRequests.get(language)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    const params = new URLSearchParams({ language })

    const response = await fetch(
      `/api/inventory/ownership?${params.toString()}`,
      {
        cache: "no-store",
      },
    )

    if (response.status === 401) {
      return {}
    }

    if (!response.ok) {
      throw new Error(
        `Ownership request failed with ${response.status}`,
      )
    }

    const data = (await response.json()) as OwnershipResponse
    const bySet =
      data.bySet && typeof data.bySet === "object"
        ? data.bySet
        : {}

    ownershipCache.set(language, {
      data: bySet,
      expiresAt: Date.now() + OWNERSHIP_CACHE_TTL_MS,
    })

    return bySet
  })()

  ownershipRequests.set(language, request)

  try {
    return await request
  } finally {
    ownershipRequests.delete(language)
  }
}

export function SetGrid({ sets, basePath = "/sets" }: SetGridProps) {
  const [ownedBySet, setOwnedBySet] = useState<Record<string, number>>({})

  const language = useMemo(
    () => languageForBasePath(basePath),
    [basePath],
  )

  useEffect(() => {
    let cancelled = false

    async function loadOwnership() {
      try {
        const bySet = await fetchOwnership(language)

        if (!cancelled) {
          setOwnedBySet(bySet)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load set ownership:", error)
        }
      }
    }

    void loadOwnership()

    return () => {
      cancelled = true
    }
  }, [language])

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {sets.map((set) => (
        <SetCard
          key={set.id}
          set={set}
          basePath={basePath}
          ownedCount={ownedBySet[set.id] ?? 0}
        />
      ))}
    </div>
  )
}

function SetCard({
  set,
  basePath,
  ownedCount,
}: {
  set: PokemonSet
  basePath: string
  ownedCount: number
}) {
  const releaseDate = set.releaseDate ? new Date(set.releaseDate) : null
  const formattedDate =
    releaseDate && !Number.isNaN(releaseDate.getTime())
      ? releaseDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : "Unknown"

  const completionPercent =
    set.total > 0 ? Math.min(100, (ownedCount / set.total) * 100) : 0

  return (
    <Link href={`${basePath}/${set.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex flex-col items-center p-4">
          <div className="relative mb-3 flex h-20 w-full items-center justify-center">
            {set.images.logo ? (
              <img
                src={set.images.logo}
                alt={`${set.name} logo`}
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
              />
            ) : set.images.symbol ? (
              <img
                src={set.images.symbol}
                alt={`${set.name} symbol`}
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                <Layers className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>

          {set.images.symbol && !set.images.logo && (
            <img
              src={set.images.symbol}
              alt={`${set.name} symbol`}
              className="mb-2 h-6 w-6"
            />
          )}

          <h3 className="mb-2 text-center text-sm font-medium leading-tight text-foreground">
            {set.name}
          </h3>

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

          {ownedCount > 0 && (
            <div className="mt-3 w-full">
              <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {ownedCount}/{set.total} owned ·{" "}
                  {completionPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}