import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { ADMIN_EMAIL } from "@/lib/auth"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/admin/users/[id]
 *
 * Returns one Supabase Auth user for the Admin Control Center.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.getUserById(id)

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 404,
        },
      )
    }

    const user = data.user

    return NextResponse.json({
      user: {
        id: user.id,

        email: user.email ?? null,

        storeName:
          typeof user.user_metadata?.store_name === "string"
            ? user.user_metadata.store_name
            : null,

        companyId:
          typeof user.user_metadata?.company_id === "string"
            ? user.user_metadata.company_id
            : null,

        isAdmin: user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase(),

        confirmed: Boolean(user.email_confirmed_at),

        createdAt: user.created_at,

        lastSignInAt: user.last_sign_in_at ?? null,

        bannedUntil: user.banned_until ?? null,
      },
    })
  } catch (error) {
    console.error("Admin user GET failed:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load user",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * PATCH /api/admin/users/[id]
 *
 * Admin-only account editing.
 *
 * Supports:
 * - email
 * - password
 * - store name
 * - company
 * - email confirmation
 * - suspend / reactivate
 *
 * Admin status is intentionally NOT editable.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json(
      {
        error: "Invalid request body",
      },
      {
        status: 400,
      },
    )
  }

  const admin = createAdminClient()

  /**
   * Fetch the current target user first.
   *
   * We need this both for owner protection and metadata merging.
   */
  const { data: targetData, error: targetError } =
    await admin.auth.admin.getUserById(id)

  if (targetError || !targetData.user) {
    return NextResponse.json(
      {
        error: targetError?.message ?? "User not found",
      },
      {
        status: 404,
      },
    )
  }

  const target = targetData.user

  const targetIsOwner =
    target.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()

  const updates: {
    email?: string
    password?: string
    email_confirm?: boolean
    ban_duration?: string
    user_metadata?: Record<string, unknown>
  } = {}

  /**
   * EMAIL
   */
  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        {
          error: "Email cannot be empty",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * Prevent moving the owner account away from its
     * protected email address.
     */
    if (targetIsOwner && email !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          error: "The owner account email cannot be changed here.",
        },
        {
          status: 400,
        },
      )
    }

    /**
     * Prevent assigning the protected admin email
     * to another account.
     */
    if (!targetIsOwner && email === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          error: "The owner administrator email is reserved.",
        },
        {
          status: 409,
        },
      )
    }

    updates.email = email
  }

  /**
   * PASSWORD
   */
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters",
        },
        {
          status: 400,
        },
      )
    }

    updates.password = body.password
  }

  /**
   * EMAIL CONFIRMATION
   */
  if (body.confirmEmail === true) {
    updates.email_confirm = true
  }

  /**
   * SUSPEND / REACTIVATE
   *
   * Supabase's Admin API supports ban_duration.
   *
   * We protect the owner account from being suspended.
   */
  if (typeof body.suspended === "boolean") {
    if (targetIsOwner && body.suspended) {
      return NextResponse.json(
        {
          error: "The owner account cannot be suspended.",
        },
        {
          status: 400,
        },
      )
    }

    updates.ban_duration = body.suspended ? "876000h" : "none"
  }

  /**
   * METADATA
   *
   * Merge the existing metadata so we don't accidentally
   * wipe unrelated values such as trial_started_at.
   */
  const metadata = {
    ...(target.user_metadata ?? {}),
  } as Record<string, unknown>

  let metadataChanged = false

  if (typeof body.storeName === "string") {
    metadata.store_name = body.storeName.trim()

    metadataChanged = true
  }

  if (typeof body.companyId === "string") {
    metadata.company_id = body.companyId.trim() || null

    metadataChanged = true
  }

  /**
   * Never trust or maintain an is_admin user metadata flag.
   * Admin access is determined exclusively by ADMIN_EMAIL.
   */
  if ("is_admin" in metadata) {
    delete metadata.is_admin
    metadataChanged = true
  }

  if (metadataChanged) {
    updates.user_metadata = metadata
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        error: "Nothing to update",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const { data, error } = await admin.auth.admin.updateUserById(id, updates)

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      )
    }

    return NextResponse.json({
      ok: true,

      user: {
        id: data.user.id,

        email: data.user.email ?? null,

        storeName:
          typeof data.user.user_metadata?.store_name === "string"
            ? data.user.user_metadata.store_name
            : null,

        companyId:
          typeof data.user.user_metadata?.company_id === "string"
            ? data.user.user_metadata.company_id
            : null,

        confirmed: Boolean(data.user.email_confirmed_at),

        bannedUntil: data.user.banned_until ?? null,
      },
    })
  } catch (error) {
    console.error("Admin user PATCH failed:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Permanently removes a Supabase Auth user.
 *
 * The platform owner cannot be deleted.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json(
      {
        error: "User id is required",
      },
      {
        status: 400,
      },
    )
  }

  const admin = createAdminClient()

  const { data: target, error: targetError } =
    await admin.auth.admin.getUserById(id)

  if (targetError || !target?.user) {
    return NextResponse.json(
      {
        error: targetError?.message ?? "User not found",
      },
      {
        status: 404,
      },
    )
  }

  if (target.user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json(
      {
        error: "The owner account cannot be deleted",
      },
      {
        status: 400,
      },
    )
  }

  /**
   * IMPORTANT:
   *
   * This is a permanent Auth-user delete.
   *
   * Later, in the Admin UI, I recommend making "Suspend"
   * the normal action and putting permanent Delete behind
   * an extra confirmation.
   */
  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 400,
      },
    )
  }

  return NextResponse.json({
    ok: true,
  })
}
