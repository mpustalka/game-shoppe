import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"
import { resolveDataScope, scopeFilters } from "@/lib/user-scope"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const scope = await resolveDataScope()
  if (scope instanceof NextResponse) return scope
  if (scope.mode === "isolated") return NextResponse.json({ ok: true })

  const { id } = await params

  try {
    await supabaseTable("customer_lists", {
      method: "DELETE",
      filters: [`id=eq.${id}`, ...scopeFilters(scope)],
    })
  } catch (error) {
    console.error("Customer list DELETE failed", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown list error",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
