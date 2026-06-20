import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type CompanyRow = {
  id: string
  name: string
  created_at: string
}

// GET /api/admin/companies — list companies (admin only).
export async function GET() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("companies")
    .select("id,name,created_at")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ companies: (data ?? []) as CompanyRow[] })
}

// POST /api/admin/companies — create a company (admin only).
export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("companies")
    .insert({ name })
    .select("id,name,created_at")
    .single()

  if (error) {
    const message = error.code === "23505" ? "That company already exists" : error.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ company: data as CompanyRow }, { status: 201 })
}
