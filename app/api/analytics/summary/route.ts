import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

export async function GET() {
  const db = getDatabase()
  const topSearches = await db.sql`
    SELECT normalized_query AS query, COUNT(*)::int AS searches, MAX(result_count)::int AS last_result_count
    FROM card_search_events
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY normalized_query
    ORDER BY searches DESC, query ASC
    LIMIT 12
  `

  const dailySearches = await db.sql`
    SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS day, COUNT(*)::int AS searches
    FROM card_search_events
    WHERE created_at >= NOW() - INTERVAL '14 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY DATE_TRUNC('day', created_at) ASC
  `

  return NextResponse.json({ topSearches, dailySearches })
}
