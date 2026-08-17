import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

import {
  resolveDataScope,
  scopeFilters,
  ownerStamp,
  pendingSetupResponse,
} from "@/lib/user-scope"

import { requireFeature } from "@/lib/subscription-server"

import type { CustomerList, CustomerListItem } from "@/lib/types"

type CustomerListRow = {
  id: string
  customer_name: string | null
  note: string | null
  items: CustomerListItem[] | null
  created_at: string
  updated_at: string
}

function rowToList(row: CustomerListRow): CustomerList {
  return {
    id: row.id,
    customerName: row.customer_name ?? "",
    note: row.note ?? "",
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function GET() {
  // Customer Lists are Premium-only.
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

  if (scope.mode === "isolated") {
    return NextResponse.json([])
  }

  try {
    const rows = (await supabaseTable("customer_lists", {
      select: "id,customer_name,note,items,created_at,updated_at",

      filters: scopeFilters(scope),

      order: "updated_at.desc",
    })) as CustomerListRow[]

    return NextResponse.json((rows ?? []).map(rowToList))
  } catch (error) {
    console.error("Customer list GET failed", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown list error",
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(request: Request) {
  // Customer Lists are Premium-only.
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

  if (scope.mode === "isolated") {
    return pendingSetupResponse()
  }

  const body = await request.json().catch(() => null)

  if (!body?.id) {
    return NextResponse.json(
      {
        error: "A list id is required",
      },
      {
        status: 400,
      },
    )
  }

  const now = new Date().toISOString()

  const items: CustomerListItem[] = Array.isArray(body.items) ? body.items : []

  try {
    await supabaseTable("customer_lists", {
      method: "POST",

      onConflict: "id",

      body: {
        id: String(body.id),

        ...ownerStamp(scope),

        customer_name: String(body.customerName ?? ""),

        note: String(body.note ?? ""),

        items,

        created_at: body.createdAt ?? now,

        updated_at: now,
      },
    })
  } catch (error) {
    console.error("Customer list POST failed", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown list error",
      },
      {
        status: 500,
      },
    )
  }

  return NextResponse.json(
    {
      ok: true,
    },
    {
      status: 201,
    },
  )
}
