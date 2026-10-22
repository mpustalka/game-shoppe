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
  card_name: string | null
  set_name: string | null
  finish: string | null
  market_price: number
  captured_on: string
}

type InventoryRow = {
  item: Record<string, unknown>
}

const WEEK_MS =
  7 * 24 * 60 * 60 * 1000

const HISTORY_DAYS = 120

function daysAgoIsoDate(
  days: number,
) {
  return new Date(
    Date.now() -
      days *
        24 *
        60 *
        60 *
        1000,
  )
    .toISOString()
    .slice(0, 10)
}

function weekIndex(
  isoDate: string,
) {
  return Math.floor(
    Date.parse(
      `${isoDate}T00:00:00Z`,
    ) / WEEK_MS,
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

type Series = {
  cardId: string
  name: string
  set: string
  finish: string
  readings: Array<{
    date: string
    price: number
  }>
}

function buildSeries(
  rows: SnapshotRow[],
) {
  const map =
    new Map<
      string,
      Series
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

    const entry =
      map.get(key) ??
      ({
        cardId:
          row.card_id,

        name:
          row.card_name ||
          row.card_id,

        set:
          row.set_name ||
          "",

        finish,

        readings: [],
      } satisfies Series)

    entry.readings.push({
      date:
        row.captured_on,
      price,
    })

    map.set(
      key,
      entry,
    )
  }

  for (
    const series of
    map.values()
  ) {
    series.readings.sort(
      (a, b) =>
        a.date.localeCompare(
          b.date,
        ),
    )
  }

  return map
}

function weeklyPrices(
  readings: Array<{
    date: string
    price: number
  }>,
) {
  const byWeek =
    new Map<
      number,
      {
        date: string
        price: number
      }
    >()

  for (
    const reading of
    readings
  ) {
    const week =
      weekIndex(
        reading.date,
      )

    const existing =
      byWeek.get(week)

    if (
      !existing ||
      reading.date >=
        existing.date
    ) {
      byWeek.set(
        week,
        reading,
      )
    }
  }

  return Array.from(
    byWeek.entries(),
  )
    .sort(
      (a, b) =>
        a[0] - b[0],
    )
    .map(
      ([, value]) =>
        value.price,
    )
}

function emptyResponse() {
  return NextResponse.json({
    trackedCards: 0,
    daysTracked: 0,
    weeksTracked: 0,
    thresholdPercent: 7,
    thresholdAmount: 1,
    bigGainers: [],
    bigDrops: [],
    gainStreaks: [],
    unusual: [],
  })
}

export async function GET() {
  const gate =
    await requireFeature(
      (e) =>
        e.canUseAnalytics,
      "Analytics insights",
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
     * Establish the inventory
     * ownership boundary first.
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
     * Global market history.
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
        "card_id,card_name,set_name,finish,market_price,captured_on",
      ).catch(
        () => [],
      )) as SnapshotRow[]

    /*
     * CRITICAL:
     * Only keep global market
     * snapshots for cards owned
     * by this account/company.
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
      buildSeries(rows)

    const distinctDays =
      new Set(
        rows.map(
          (row) =>
            row.captured_on,
        ),
      )

    const distinctWeeks =
      new Set(
        rows.map(
          (row) =>
            weekIndex(
              row.captured_on,
            ),
        ),
      )

    const weekAgo =
      daysAgoIsoDate(7)

    const bigGainers:
      Array<
        Record<
          string,
          unknown
        >
      > = []

    const bigDrops:
      Array<
        Record<
          string,
          unknown
        >
      > = []

    const gainStreaks:
      Array<
        Record<
          string,
          unknown
        >
      > = []

    const unusual:
      Array<
        Record<
          string,
          unknown
        >
      > = []

    for (
      const s of
      series.values()
    ) {
      /*
       * THIS WEEK
       */
      const window =
        s.readings.filter(
          (reading) =>
            reading.date >=
            weekAgo,
        )

      if (
        window.length >= 2
      ) {
        const first =
          window[0].price

        const last =
          window[
            window.length -
              1
          ].price

        if (
          first >= 0.5 &&
          first > 0
        ) {
          const change =
            last - first

          const changePercent =
            (change /
              first) *
            100

          const mover = {
            cardId:
              s.cardId,
            name:
              s.name,
            set:
              s.set,
            finish:
              s.finish,
            first:
              Number(
                first.toFixed(
                  2,
                ),
              ),
            last:
              Number(
                last.toFixed(
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
          }

          if (
            changePercent >=
              7 ||
            change >= 1
          ) {
            bigGainers.push(
              mover,
            )
          }

          if (
            changePercent <=
              -7 ||
            change <= -1
          ) {
            bigDrops.push(
              mover,
            )
          }
        }
      }

      /*
       * WEEKLY SIGNALS
       */
      const weekly =
        weeklyPrices(
          s.readings,
        )

      if (
        weekly.length >= 2
      ) {
        const returns:
          number[] = []

        for (
          let i = 1;
          i <
          weekly.length;
          i++
        ) {
          const previous =
            weekly[i - 1]

          if (
            previous > 0
          ) {
            returns.push(
              (
                weekly[i] -
                previous
              ) /
                previous,
            )
          }
        }

        /*
         * Consecutive gains.
         */
        let streak = 0

        for (
          let i =
            returns.length -
            1;
          i >= 0;
          i--
        ) {
          if (
            returns[i] > 0
          ) {
            streak++
          } else {
            break
          }
        }

        if (
          streak >= 3
        ) {
          const startPrice =
            weekly[
              weekly.length -
                1 -
                streak
            ]

          const endPrice =
            weekly[
              weekly.length -
                1
            ]

          gainStreaks.push({
            cardId:
              s.cardId,
            name:
              s.name,
            set:
              s.set,
            finish:
              s.finish,
            weeks:
              streak,
            last:
              Number(
                endPrice.toFixed(
                  2,
                ),
              ),
            changePercent:
              startPrice > 0
                ? Number(
                    (
                      (
                        (endPrice -
                          startPrice) /
                        startPrice
                      ) *
                      100
                    ).toFixed(
                      1,
                    ),
                  )
                : 0,
          })
        }

        /*
         * Unusual movement.
         */
        if (
          returns.length >=
          4
        ) {
          const history =
            returns.slice(
              0,
              -1,
            )

          const latest =
            returns[
              returns.length -
                1
            ]

          const mean =
            history.reduce(
              (
                sum,
                value,
              ) =>
                sum +
                value,
              0,
            ) /
            history.length

          const variance =
            history.reduce(
              (
                sum,
                value,
              ) =>
                sum +
                (value -
                  mean) **
                  2,
              0,
            ) /
            history.length

          const std =
            Math.sqrt(
              variance,
            )

          if (
            std > 0.005
          ) {
            const z =
              (latest -
                mean) /
              std

            if (
              Math.abs(z) >=
              2
            ) {
              unusual.push({
                cardId:
                  s.cardId,
                name:
                  s.name,
                set:
                  s.set,
                finish:
                  s.finish,
                last:
                  Number(
                    weekly[
                      weekly.length -
                        1
                    ].toFixed(
                      2,
                    ),
                  ),
                changePercent:
                  Number(
                    (
                      latest *
                      100
                    ).toFixed(
                      1,
                    ),
                  ),
                z:
                  Number(
                    z.toFixed(
                      1,
                    ),
                  ),
                direction:
                  latest >= 0
                    ? "up"
                    : "down",
              })
            }
          }
        }
      }
    }

    bigGainers.sort(
      (a, b) =>
        (b.changePercent as number) -
        (a.changePercent as number),
    )

    bigDrops.sort(
      (a, b) =>
        (a.changePercent as number) -
        (b.changePercent as number),
    )

    gainStreaks.sort(
      (a, b) =>
        (b.weeks as number) -
        (a.weeks as number),
    )

    unusual.sort(
      (a, b) =>
        Math.abs(
          b.z as number,
        ) -
        Math.abs(
          a.z as number,
        ),
    )

    return NextResponse.json({
      trackedCards:
        series.size,

      daysTracked:
        distinctDays.size,

      weeksTracked:
        distinctWeeks.size,

      thresholdPercent: 7,
      thresholdAmount: 1,

      bigGainers:
        bigGainers.slice(
          0,
          12,
        ),

      bigDrops:
        bigDrops.slice(
          0,
          12,
        ),

      gainStreaks:
        gainStreaks.slice(
          0,
          12,
        ),

      unusual:
        unusual.slice(
          0,
          12,
        ),
    })
  } catch (error) {
    console.error(
      "Insights computation failed",
      error,
    )

    return emptyResponse()
  }
}