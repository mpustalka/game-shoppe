import { NextResponse } from "next/server"

import {
  createAdminClient,
} from "@/lib/supabase/admin"
import {
  createClient,
} from "@/lib/supabase/server"

export async function POST(
  request: Request,
) {
  const supabase =
    await createClient()

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser()

  if (
    authError ||
    !user ||
    !user.email
  ) {
    return NextResponse.json(
      {
        error:
          "You must be signed in to accept this invitation.",
        code:
          "auth_required",
      },
      { status: 401 },
    )
  }

  const body =
    await request
      .json()
      .catch(() => null)

  const invitationId =
    typeof body?.invitationId ===
    "string"
      ? body.invitationId.trim()
      : ""

  if (!invitationId) {
    return NextResponse.json(
      {
        error:
          "Missing invitation.",
      },
      { status: 400 },
    )
  }

  const admin =
    createAdminClient()

  const {
    data: invitation,
    error: invitationError,
  } = await admin
    .from(
      "company_invitations",
    )
    .select(
      `
        id,
        company_id,
        email,
        role,
        permissions,
        status,
        expires_at
      `,
    )
    .eq(
      "id",
      invitationId,
    )
    .maybeSingle()

  if (
    invitationError ||
    !invitation
  ) {
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
          "This invitation is no longer active.",
      },
      { status: 409 },
    )
  }

  const expiresAt =
    new Date(
      invitation.expires_at,
    ).getTime()

  if (
    !Number.isFinite(
      expiresAt,
    ) ||
    expiresAt <= Date.now()
  ) {
    await admin
      .from(
        "company_invitations",
      )
      .update({
        status: "expired",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        invitation.id,
      )

    return NextResponse.json(
      {
        error:
          "This invitation has expired.",
        code:
          "invitation_expired",
      },
      { status: 410 },
    )
  }

  if (
    user.email
      .trim()
      .toLowerCase() !==
    invitation.email
      .trim()
      .toLowerCase()
  ) {
    return NextResponse.json(
      {
        error:
          "This invitation belongs to a different email address.",
        code:
          "invitation_email_mismatch",
      },
      { status: 403 },
    )
  }

  /*
   * Recheck seat capacity at ACCEPTANCE time.
   *
   * Never rely only on the seat check that occurred
   * when the invitation was created.
   */
  const {
    data: company,
    error: companyError,
  } = await admin
    .from("companies")
    .select(
      "id, included_seats",
    )
    .eq(
      "id",
      invitation.company_id,
    )
    .maybeSingle()

  if (
    companyError ||
    !company
  ) {
    return NextResponse.json(
      {
        error:
          "Business not found.",
      },
      { status: 404 },
    )
  }

  const {
    count: memberCount,
  } = await admin
    .from("company_members")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      invitation.company_id,
    )
    .neq("status", "removed")

  const includedSeats =
    Math.max(
      1,
      Number(
        company.included_seats,
      ) || 1,
    )

  /*
   * The invitation itself already reserved this
   * person's seat, so only existing memberships
   * are compared here.
   */
  if (
    (memberCount ?? 0) >=
    includedSeats
  ) {
    return NextResponse.json(
      {
        error:
          "This business has reached its team seat limit.",
        code:
          "seat_limit_reached",
      },
      { status: 409 },
    )
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("company_members")
    .select(
      "id, status",
    )
    .eq(
      "company_id",
      invitation.company_id,
    )
    .eq(
      "user_id",
      user.id,
    )
    .maybeSingle()

  if (existingError) {
    return NextResponse.json(
      {
        error:
          "Unable to verify membership.",
      },
      { status: 500 },
    )
  }

  const now =
    new Date().toISOString()

  if (existing) {
    const {
      error: restoreError,
    } = await admin
      .from("company_members")
      .update({
        role:
          invitation.role,

        status: "active",

        permissions:
          invitation.permissions ??
          {},

        invited_at: now,
        joined_at: now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq(
        "company_id",
        invitation.company_id,
      )

    if (restoreError) {
      return NextResponse.json(
        {
          error:
            "Unable to activate membership.",
        },
        { status: 500 },
      )
    }
  } else {
    const {
      error: memberError,
    } = await admin
      .from("company_members")
      .insert({
        company_id:
          invitation.company_id,

        user_id:
          user.id,

        role:
          invitation.role,

        status: "active",

        permissions:
          invitation.permissions ??
          {},

        invited_at: now,
        joined_at: now,
      })

    if (memberError) {
      console.error(
        "Membership creation failed:",
        memberError,
      )

      return NextResponse.json(
        {
          error:
            "Unable to create business membership.",
        },
        { status: 500 },
      )
    }
  }

  const {
    error: acceptedError,
  } = await admin
    .from(
      "company_invitations",
    )
    .update({
      status: "accepted",
      accepted_at: now,
      updated_at: now,
    })
    .eq(
      "id",
      invitation.id,
    )
    .eq(
      "status",
      "pending",
    )

  if (acceptedError) {
    console.error(
      "Unable to mark invitation accepted:",
      acceptedError,
    )
  }

  return NextResponse.json({
    ok: true,

    companyId:
      invitation.company_id,
  })
}
