import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

import { resolveDataScope, scopeFilters } from "@/lib/user-scope"

import { requireFeature } from "@/lib/subscription-server"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  // Premium-only feature
  const gate = await requireFeature(
    (e) => e.canUseCustomerLists,
    "Customer Lists",
    "premium",
  )

  if (gate instanceof NextResponse) {
    return gate
  }

  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  // Account has no usable data scope yet.
  // Treat delete as a no-op rather than leaking anything.
  if (scope.mode === "isolated") {
    return NextResponse.json({
      ok: true,
    })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json(
      {
        error: "Customer list id is required",
      },
      {
        status: 400,
      },
    )
  }

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
      {
        status: 500,
      },
    )
  }

  return NextResponse.json({
    ok: true,
  })
}
