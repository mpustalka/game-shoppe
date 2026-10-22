import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { requireFeature } from "@/lib/subscription-server"
import { loadSnapshotsForCards } from "@/lib/price-snapshots"
import {
  scopeFilters,
} from "@/lib/user-scope"
import { resolveInventoryScope } from "@/lib/inventory-scope"

type SnapshotRow = {
  card_id: string
  finish: string | null
  market_price: number | string
  captured_on: string
}

type InventoryRow = {
  item: Record<string, unknown>
}

type Reading = {
  date: string
  price: number
}

type Move = {
  last: number
  prev: number
  change: number
  changePercent: number
  direction:
    | "up"
    | "down"
    | "flat"
  spanDays: number
}

const DAY_MS =
  24 * 60 * 60 * 1000

const HISTORY_DAYS = 45

function daysAgoIsoDate(
  days: number,
) {
  return new Date(
    Date.now() -
      days * DAY_MS,
  )
    .toISOString()
    .slice(0, 10)
}

function shiftIso(
  isoDate: string,
  deltaDays: number,
) {
  return new Date(
    Date.parse(
      `${isoDate}T00:00:00Z`,
    ) +
      deltaDays * DAY_MS,
  )
    .toISOString()
    .slice(0, 10)
}

function daySpan(
  fromIso: string,
  toIso: string,
) {
  return Math.round(
    (
      Date.parse(
        `${toIso}T00:00:00Z`,
      ) -
      Date.parse(
        `${fromIso}T00:00:00Z`,
      )
    ) /
      DAY_MS,
  )
}

function normalizeFinish(
  value: unknown,
) {
  return typeof value ===
    "string" &&
    value.trim()
    ? value.trim()
    : "Normal"
}

function emptyResponse() {
  return NextResponse.json({
    asOf: null,
    tracked: 0,
    up: 0,
    down: 0,
    flat: 0,
    moves: {},
  })
}

export async function GET() {
  const gate =
    await requireFeature(
      (e) =>
        e.canUseAnalytics,
      "Price movement analytics",
      "premium",
    )

  if (
    gate instanceof
    NextResponse
  ) {
    return gate
  }

  const scope =
    await resolveInventoryScope()

  if (
    scope instanceof
    NextResponse
  ) {
    return scope
  }

  try {
    /*
     * First establish ownership.
     *
     * Individual account:
     *   inventory_items.user_id
     *
     * Business:
     *   inventory_items.company_id
     *
     * scopeFilters() handles that
     * distinction for us.
     */
    const inventoryRows =
      (await supabaseTable(
        "inventory_items",
        {
          select: "item",
          filters:
            scopeFilters(scope),
          order:
            "created_at.desc",
          limit: 50000,
        },
      ).catch(
        () => [],
      )) as InventoryRow[]

    const ownedKeys =
      new Set<string>()

    for (
      const row of
      inventoryRows
    ) {
      const item =
        row.item || {}

      const cardId =
        typeof item.cardId ===
        "string"
          ? item.cardId
          : ""

      if (!cardId) {
        continue
      }

      const quantity =
        Number(
          item.quantity ?? 1,
        )

      if (
        !Number.isFinite(
          quantity,
        ) ||
        quantity <= 0
      ) {
        continue
      }

      ownedKeys.add(
        `${cardId}|${normalizeFinish(
          item.finish,
        )}`,
      )
    }

    if (
      ownedKeys.size === 0
    ) {
      return emptyResponse()
    }

    /*
     * Snapshot data itself remains
     * global market data.
     */
    const snapshotRows =
      (await loadSnapshotsForCards<SnapshotRow>(
        Array.from(
          ownedKeys,
          (key) => key.split("|")[0],
        ),
        daysAgoIsoDate(
          HISTORY_DAYS,
        ),
        "card_id,finish,market_price,captured_on",
      ).catch(
        () => [],
      )) as SnapshotRow[]

    /*
     * Critical ownership boundary.
     */
    const rows =
      snapshotRows.filter(
        (row) =>
          ownedKeys.has(
            `${row.card_id}|${normalizeFinish(
              row.finish,
            )}`,
          ),
      )

    const series =
      new Map<
        string,
        Reading[]
      >()

    for (
      const row of rows
    ) {
      const price =
        Number(
          row.market_price,
        )

      if (
        !Number.isFinite(
          price,
        ) ||
        price <= 0
      ) {
        continue
      }

      const finish =
        normalizeFinish(
          row.finish,
        )

      const key =
        `${row.card_id}|${finish}`

      const list =
        series.get(key) ??
        []

      list.push({
        date:
          row.captured_on,
        price,
      })

      series.set(
        key,
        list,
      )
    }

    const moves:
      Record<
        string,
        Move
      > = {}

    let up = 0
    let down = 0
    let flat = 0

    for (
      const [
        key,
        readings,
      ] of series
    ) {
      if (
        readings.length <
        2
      ) {
        continue
      }

      const latest =
        readings[
          readings.length -
            1
        ]

      const baselineDate =
        shiftIso(
          latest.date,
          -7,
        )

      let baseline:
        Reading | null =
        null

      for (
        const reading of
        readings
      ) {
        if (
          reading.date <=
          baselineDate
        ) {
          baseline =
            reading
        } else {
          break
        }
      }

      if (!baseline) {
        baseline =
          readings[0]
      }

      if (
        baseline.date ===
        latest.date
      ) {
        continue
      }

      const change =
        latest.price -
        baseline.price

      const changePercent =
        baseline.price > 0
          ? (change /
              baseline.price) *
            100
          : 0

      const direction:
        Move["direction"] =
        change > 0.001
          ? "up"
          : change <
              -0.001
            ? "down"
            : "flat"

      if (
        direction === "up"
      ) {
        up += 1
      } else if (
        direction ===
        "down"
      ) {
        down += 1
      } else {
        flat += 1
      }

      moves[key] = {
        last:
          Number(
            latest.price.toFixed(
              2,
            ),
          ),

        prev:
          Number(
            baseline.price.toFixed(
              2,
            ),
          ),

        change:
          Number(
            change.toFixed(
              2,
            ),
          ),

        changePercent:
          Number(
            changePercent.toFixed(
              1,
            ),
          ),

        direction,

        spanDays:
          daySpan(
            baseline.date,
            latest.date,
          ),
      }
    }

    return NextResponse.json({
      asOf:
        rows.length > 0
          ? rows[
              rows.length -
                1
            ].captured_on
          : null,

      tracked:
        Object.keys(
          moves,
        ).length,

      up,
      down,
      flat,
      moves,
    })
  } catch (error) {
    console.error(
      "Weekly price-moves computation failed",
      error,
    )

    return emptyResponse()
  }
}