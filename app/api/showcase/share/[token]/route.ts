import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { rowToShowcase, type ShowcaseRow } from "../../route"

interface RouteContext {
  params: Promise<{ token: string }>
}

// Public, read-only endpoint backing the shareable /share/[token] page. No auth
// required — anyone with the link can view the binder. Only the safe, display
// fields are returned (no internal ids beyond what the view needs).
export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params

  const rows = (await supabaseTable("showcase_binders", {
    select: "id,share_token,name,items,created_at,updated_at",
    filters: [`share_token=eq.${token}`],
    limit: 1,
  })) as ShowcaseRow[] | null

  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null

  if (!row) {
    return NextResponse.json({ error: "Showcase not found" }, { status: 404 })
  }

  return NextResponse.json(rowToShowcase(row))
}
