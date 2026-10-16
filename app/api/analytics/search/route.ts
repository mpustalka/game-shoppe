import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import {
  resolveDataScope,
  ownerStamp,
  tenantScopeRequiredResponse,
} from "@/lib/user-scope"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const query =
    typeof body?.query === "string"
      ? body.query.trim()
      : ""

  const resultCount =
    typeof body?.resultCount === "number"
      ? body.resultCount
      : Number(body?.resultCount ?? 0)

  if (!query) {
    return NextResponse.json({
      ok: true,
      skipped: true,
    })
  }

  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  const tenantError =
    tenantScopeRequiredResponse(scope)

  if (tenantError) {
    return tenantError
  }

  try {
    await supabaseTable("card_search_events", {
      method: "POST",
      body: {
        ...ownerStamp(scope),
        query: query.slice(0, 160),
        normalized_query: query
          .toLowerCase()
          .slice(0, 160),
        result_count: Math.max(
          0,
          Number.isFinite(resultCount)
            ? resultCount
            : 0,
        ),
      },
    })
  } catch (error) {
    console.error(
      "Search telemetry failed",
      error,
    )

    /*
     * Search telemetry must never break the
     * user's actual search experience.
     */
    return NextResponse.json({
      ok: true,
      skipped: true,
    })
  }

  return NextResponse.json({
    ok: true,
  })
}