import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const query = typeof body?.query === "string" ? body.query.trim() : ""
  const resultCount = Number.isFinite(body?.resultCount)
    ? Number(body.resultCount)
    : 0

  if (query.length < 2) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  await supabaseTable("card_search_events", {
    method: "POST",
    body: {
      query: query.slice(0, 160),
      normalized_query: query.toLowerCase().slice(0, 160),
      result_count: Math.max(0, resultCount),
    },
  })

  return NextResponse.json({ ok: true })
}
