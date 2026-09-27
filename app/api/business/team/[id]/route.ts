import { NextResponse } from "next/server"

import {
  requireCompanyPermission,
} from "@/lib/company-auth"
import {
  BUSINESS_PERMISSION_KEYS,
  type BusinessPermission,
} from "@/lib/business-permissions"
import {
  createAdminClient,
} from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function cleanPermissions(
  value: unknown,
) {
  const result: Partial<
    Record<BusinessPermission, boolean>
  > = {}

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return result
  }

  const source =
    value as Record<string, unknown>

  for (const key of BUSINESS_PERMISSION_KEYS) {
    if (typeof source[key] === "boolean") {
      result[key] =
        source[key] as boolean
    }
  }

  // Never delegate ownership-level billing control.
  result["billing.manage"] = false

  return result
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const gate =
    await requireCompanyPermission(
      "team.manage",
    )

  if (gate instanceof NextResponse) {
    return gate
  }

  if (!gate.companyId) {
    return NextResponse.json(
      {
        error:
          "Business context required",
      },
      { status: 403 },
    )
  }

  const { id } = await params

  const body =
    await request
      .json()
      .catch(() => null)

  const admin =
    createAdminClient()

  const {
    data: target,
    error: targetError,
  } = await admin
    .from("company_members")
    .select(
      `
        id,
        user_id,
        role,
        status,
        permissions
      `,
    )
    .eq("id", id)
    .eq(
      "company_id",
      gate.companyId,
    )
    .maybeSingle()

  if (targetError) {
    console.error(
      "Team member lookup failed:",
      targetError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load team member.",
      },
      { status: 500 },
    )
  }

  if (!target) {
    return NextResponse.json(
      {
        error:
          "Team member not found.",
      },
      { status: 404 },
    )
  }

  /*
   * The owner membership cannot be edited through
   * ordinary team management.
   */
  if (target.role === "owner") {
    return NextResponse.json(
      {
        error:
          "The business owner cannot be modified from Team & Permissions.",
        code:
          "owner_protected",
      },
      { status: 403 },
    )
  }

  /*
   * Managers may manage employees, but only an owner
   * may manage another manager.
   */
  if (
    !gate.isSuperAdmin &&
    gate.companyRole !== "owner" &&
    target.role === "manager"
  ) {
    return NextResponse.json(
      {
        error:
          "Only the business owner can manage managers.",
      },
      { status: 403 },
    )
  }

  const nextRole =
    body?.role === "manager"
      ? "manager"
      : body?.role === "employee"
        ? "employee"
        : target.role

  if (
    nextRole === "manager" &&
    !gate.isSuperAdmin &&
    gate.companyRole !== "owner"
  ) {
    return NextResponse.json(
      {
        error:
          "Only the business owner can assign the Manager role.",
      },
      { status: 403 },
    )
  }

  const allowedStatuses =
    new Set([
      "active",
      "suspended",
    ])

  const nextStatus =
    typeof body?.status === "string" &&
    allowedStatuses.has(
      body.status,
    )
      ? body.status
      : target.status

  const nextPermissions =
    body?.permissions !== undefined
      ? cleanPermissions(
          body.permissions,
        )
      : target.permissions ?? {}

  const {
    data: updated,
    error: updateError,
  } = await admin
    .from("company_members")
    .update({
      role: nextRole,
      status: nextStatus,
      permissions:
        nextPermissions,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", target.id)
    .eq(
      "company_id",
      gate.companyId,
    )
    .select(
      `
        id,
        user_id,
        role,
        status,
        permissions,
        updated_at
      `,
    )
    .single()

  if (updateError) {
    console.error(
      "Team member update failed:",
      updateError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to update team member.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    member: updated,
  })
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const gate =
    await requireCompanyPermission(
      "team.manage",
    )

  if (gate instanceof NextResponse) {
    return gate
  }

  if (!gate.companyId) {
    return NextResponse.json(
      {
        error:
          "Business context required",
      },
      { status: 403 },
    )
  }

  const { id } = await params

  const admin =
    createAdminClient()

  const {
    data: target,
    error,
  } = await admin
    .from("company_members")
    .select(
      "id, user_id, role",
    )
    .eq("id", id)
    .eq(
      "company_id",
      gate.companyId,
    )
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      {
        error:
          "Unable to load team member.",
      },
      { status: 500 },
    )
  }

  if (!target) {
    return NextResponse.json(
      {
        error:
          "Team member not found.",
      },
      { status: 404 },
    )
  }

  if (target.role === "owner") {
    return NextResponse.json(
      {
        error:
          "The business owner cannot be removed.",
        code:
          "owner_protected",
      },
      { status: 403 },
    )
  }

  if (
    target.user_id ===
    gate.user.id
  ) {
    return NextResponse.json(
      {
        error:
          "You cannot remove your own membership.",
      },
      { status: 403 },
    )
  }

  if (
    !gate.isSuperAdmin &&
    gate.companyRole !== "owner" &&
    target.role === "manager"
  ) {
    return NextResponse.json(
      {
        error:
          "Only the business owner can remove managers.",
      },
      { status: 403 },
    )
  }

  /*
   * Soft-remove rather than deleting the historical
   * membership row.
   */
  const {
    error: updateError,
  } = await admin
    .from("company_members")
    .update({
      status: "removed",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", target.id)
    .eq(
      "company_id",
      gate.companyId,
    )

  if (updateError) {
    console.error(
      "Team member removal failed:",
      updateError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to remove team member.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
  })
}
