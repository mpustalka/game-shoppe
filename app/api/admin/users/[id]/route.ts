import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { ADMIN_EMAIL } from "@/lib/auth"

export const dynamic = "force-dynamic"

// PATCH /api/admin/users/[id] — update a user's password and/or metadata
// (store name, company, admin flag). Admin only.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const { id } = await params
  const body = await request.json().catch(() => null)

  const updates: {
    password?: string
    user_metadata?: Record<string, unknown>
  } = {}

  if (typeof body?.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      )
    }
    updates.password = body.password
  }

  const metaUpdates: Record<string, unknown> = {}
  if (typeof body?.storeName === "string") metaUpdates.store_name = body.storeName.trim()
  if (typeof body?.companyId === "string") metaUpdates.company_id = body.companyId || null
  if (typeof body?.isAdmin === "boolean") metaUpdates.is_admin = body.isAdmin

  if (Object.keys(metaUpdates).length > 0) {
    updates.user_metadata = metaUpdates
  }

  if (!updates.password && !updates.user_metadata) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, updates)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users/[id] — remove a user account. The owner admin
// account cannot be deleted. Admin only.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const { id } = await params

  const admin = createAdminClient()

  // Refuse to delete the platform owner account.
  const { data: target } = await admin.auth.admin.getUserById(id)
  if (target?.user?.email?.toLowerCase() === ADMIN_EMAIL) {
    return NextResponse.json(
      { error: "The owner account cannot be deleted" },
      { status: 400 },
    )
  }

  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
