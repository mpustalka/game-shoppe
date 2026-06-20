import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    await supabaseTable("customer_lists", {
      method: "DELETE",
      filters: [`id=eq.${id}`],
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
