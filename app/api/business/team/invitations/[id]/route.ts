import { NextResponse } from "next/server"

import {
  requireCompanyPermission,
} from "@/lib/company-auth"
import {
  createAdminClient,
} from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{
    id: string
  }>
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
    data: invitation,
    error,
  } = await admin
    .from(
      "company_invitations",
    )
    .select(
      "id, role, status",
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
          "Unable to load invitation.",
      },
      { status: 500 },
    )
  }

  if (!invitation) {
    return NextResponse.json(
      {
        error:
          "Invitation not found.",
      },
      { status: 404 },
    )
  }

  if (
    invitation.status !==
    "pending"
  ) {
    return NextResponse.json(
      {
        error:
          "Only pending invitations can be canceled.",
      },
      { status: 409 },
    )
  }

  /*
   * Managers cannot cancel manager invitations.
   */
  if (
    invitation.role === "manager" &&
    !gate.isSuperAdmin &&
    gate.companyRole !== "owner"
  ) {
    return NextResponse.json(
      {
        error:
          "Only the business owner can manage manager invitations.",
      },
      { status: 403 },
    )
  }

  const {
    error: updateError,
  } = await admin
    .from(
      "company_invitations",
    )
    .update({
      status: "canceled",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", invitation.id)
    .eq(
      "company_id",
      gate.companyId,
    )

  if (updateError) {
    return NextResponse.json(
      {
        error:
          "Unable to cancel invitation.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
  })
}
