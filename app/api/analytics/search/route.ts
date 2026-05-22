import { getDatabase } from "@netlify/database"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const query = typeof body?.query === "string" ? body.query.trim() : ""
  const resultCount = Number.isFinite(body?.resultCount) ? Number(body.resultCount) : 0

  if (query.length < 2) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const db = getDatabase()
  await db.sql`
    INSERT INTO card_search_events (query, normalized_query, result_count)
    VALUES (${query.slice(0, 160)}, ${query.toLowerCase().slice(0, 160)}, ${Math.max(0, resultCount)})
  `

  return NextResponse.json({ ok: true })
}
