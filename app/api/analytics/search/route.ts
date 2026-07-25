import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveDataScope, ownerStamp } from "@/lib/user-scope"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const query = typeof body?.query === "string" ? body.query.trim() : ""
  const resultCount = Number.isFinite(body?.resultCount)
    ? Number(body.resultCount)
    : 0

  if (query.length < 2) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Search telemetry feeds each account's own "top searches" / "unmet demand"
  // insights, so it's recorded per user. This is fire-and-forget from the search
  // page: anything unusable — no session, no per-account storage yet, a failed
  // insert — is skipped rather than turned into a failed search.
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse || scope.mode === "isolated") {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    await supabaseTable("card_search_events", {
      method: "POST",
      body: {
        ...ownerStamp(scope),
        query: query.slice(0, 160),
        normalized_query: query.toLowerCase().slice(0, 160),
        result_count: Math.max(0, resultCount),
      },
    })
  } catch (error) {
    console.error("Search telemetry failed", error)
    return NextResponse.json({ ok: true, skipped: true })
  }

  return NextResponse.json({ ok: true })
}
