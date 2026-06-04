import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

export async function GET() {
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString()
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const rows = (await supabaseTable("card_search_events", {
    select: "normalized_query,result_count,created_at",
    filters: [`created_at=gte.${ninetyDaysAgo}`],
    order: "created_at.desc",
  })) as Array<{ normalized_query: string; result_count: number }>

  const topSearches = Object.entries(
    rows.reduce<
      Record<
        string,
        { query: string; searches: number; last_result_count: number }
      >
    >(
      (acc, row) => {
        const query = row.normalized_query || ""
        const entry = acc[query] || {
          query,
          searches: 0,
          last_result_count: 0,
        }
        entry.searches += 1
        entry.last_result_count = Math.max(
          entry.last_result_count,
          Number(row.result_count || 0),
        )
        acc[query] = entry
        return acc
      },
      {} as Record<
        string,
        { query: string; searches: number; last_result_count: number }
      >,
    ),
  )
    .map(
      ([, value]) =>
        value as { query: string; searches: number; last_result_count: number },
    )
    .sort((a, b) => b.searches - a.searches || a.query.localeCompare(b.query))
    .slice(0, 12)

  const dailyRows = await supabaseTable("card_search_events", {
    select: "created_at",
    filters: [`created_at=gte.${fourteenDaysAgo}`],
    order: "created_at.asc",
  })

  const dailyMap = new Map<string, number>()
  for (const row of dailyRows as Array<{ created_at: string }>) {
    const day = new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    })
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }

  const dailySearches = Array.from(dailyMap.entries()).map(
    ([day, searches]) => ({ day, searches }),
  )

  return NextResponse.json({ topSearches, dailySearches })
}
