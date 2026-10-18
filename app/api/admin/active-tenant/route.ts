import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { ACTIVE_INVENTORY_TENANT_COOKIE } from "@/lib/inventory-scope"

export const dynamic = "force-dynamic"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}

export async function GET() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  try {
    const admin = createAdminClient()
    const [{ data: companies, error }, cookieStore] = await Promise.all([
      admin.from("companies").select("id,name").order("name", { ascending: true }),
      cookies(),
    ])

    if (error) throw error

    const activeTenantId =
      cookieStore.get(ACTIVE_INVENTORY_TENANT_COOKIE)?.value ?? null

    return NextResponse.json({
      companies: companies ?? [],
      activeTenantId:
        activeTenantId && (companies ?? []).some((company) => company.id === activeTenantId)
          ? activeTenantId
          : null,
    })
  } catch (error) {
    console.error("Unable to load inventory tenant choices:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load companies." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const body = await request.json().catch(() => null)
  const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : ""

  if (!companyId) {
    const response = NextResponse.json({ ok: true, activeTenantId: null })
    response.cookies.set(ACTIVE_INVENTORY_TENANT_COOKIE, "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    })
    return response
  }

  try {
    const admin = createAdminClient()
    const { data: company, error } = await admin
      .from("companies")
      .select("id,name")
      .eq("id", companyId)
      .maybeSingle()

    if (error) throw error

    if (!company) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 404 },
      )
    }

    const response = NextResponse.json({
      ok: true,
      activeTenantId: company.id,
      companyName: company.name,
    })
    response.cookies.set(ACTIVE_INVENTORY_TENANT_COOKIE, company.id, COOKIE_OPTIONS)
    return response
  } catch (error) {
    console.error("Unable to select inventory tenant:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to select company." },
      { status: 500 },
    )
  }
}
