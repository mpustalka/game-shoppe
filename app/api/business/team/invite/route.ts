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

function cleanEmail(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return ""
  }

  return value
    .trim()
    .toLowerCase()
}

function cleanPermissions(
  value: unknown,
) {
  const result: Partial<
    Record<
      BusinessPermission,
      boolean
    >
  > = {}

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return result
  }

  const source =
    value as Record<
      string,
      unknown
    >

  for (
    const permission
    of BUSINESS_PERMISSION_KEYS
  ) {
    if (
      typeof source[
        permission
      ] === "boolean"
    ) {
      result[permission] =
        source[permission] as boolean
    }
  }

  /*
   * These remain owner-only regardless of what
   * somebody submits from the browser.
   */
  result["billing.manage"] =
    false

  return result
}

export async function POST(
  request: Request,
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

  const body =
    await request
      .json()
      .catch(() => null)

  const email =
    cleanEmail(body?.email)

  const role =
    body?.role === "manager"
      ? "manager"
      : "employee"

  const permissions =
    cleanPermissions(
      body?.permissions,
    )

  if (
    !email ||
    !email.includes("@")
  ) {
    return NextResponse.json(
      {
        error:
          "Enter a valid email address.",
      },
      { status: 400 },
    )
  }

  /*
   * Managers cannot create another manager.
   * Only an owner may do that.
   */
  if (
    role === "manager" &&
    !gate.isSuperAdmin &&
    gate.companyRole !== "owner"
  ) {
    return NextResponse.json(
      {
        error:
          "Only the business owner can invite managers.",
      },
      { status: 403 },
    )
  }

  const admin =
    createAdminClient()

  const {
    data: company,
    error: companyError,
  } = await admin
    .from("companies")
    .select(
      `
        id,
        name,
        included_seats
      `,
    )
    .eq("id", gate.companyId)
    .single()

  if (companyError || !company) {
    return NextResponse.json(
      {
        error:
          "Unable to load business.",
      },
      { status: 500 },
    )
  }

  const {
    count: memberCount,
    error: memberCountError,
  } = await admin
    .from("company_members")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      gate.companyId,
    )
    .neq("status", "removed")

  const {
    count: inviteCount,
    error: inviteCountError,
  } = await admin
    .from(
      "company_invitations",
    )
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      gate.companyId,
    )
    .eq("status", "pending")

  if (
    memberCountError ||
    inviteCountError
  ) {
    return NextResponse.json(
      {
        error:
          "Unable to verify available team seats.",
      },
      { status: 500 },
    )
  }

  const includedSeats =
    Math.max(
      1,
      Number(
        company.included_seats,
      ) || 1,
    )

  const seatsUsed =
    (memberCount ?? 0) +
    (inviteCount ?? 0)

  if (
    seatsUsed >=
    includedSeats
  ) {
    return NextResponse.json(
      {
        error:
          `Your plan includes ${includedSeats} team seat${
            includedSeats === 1
              ? ""
              : "s"
          }. Upgrade your plan or remove a team member before sending another invitation.`,
        code:
          "seat_limit_reached",
      },
      { status: 409 },
    )
  }

  /*
   * Don't invite someone who is already a member.
   *
   * We need to locate the Auth account by email.
   * listUsers is paginated, so walk pages until
   * we find the address or exhaust the directory.
   */
  let existingAuthUser:
    | {
        id: string
        email?: string
      }
    | undefined

  let page = 1

  while (
    !existingAuthUser
  ) {
    const {
      data,
      error,
    } =
      await admin.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        },
      )

    if (error) {
      console.error(
        "Unable to inspect Auth users:",
        error,
      )
      break
    }

    existingAuthUser =
      data.users.find(
        (candidate) =>
          candidate.email
            ?.toLowerCase() ===
          email,
      )

    if (
      data.users.length <
      1000
    ) {
      break
    }

    page += 1
  }

  if (existingAuthUser) {
    const {
      data: membership,
    } = await admin
      .from("company_members")
      .select(
        "id, status",
      )
      .eq(
        "company_id",
        gate.companyId,
      )
      .eq(
        "user_id",
        existingAuthUser.id,
      )
      .maybeSingle()

    if (
      membership &&
      membership.status !==
        "removed"
    ) {
      return NextResponse.json(
        {
          error:
            "That user is already a member of this business.",
        },
        { status: 409 },
      )
    }
  }

  const expiresAt =
    new Date(
      Date.now() +
        7 *
          24 *
          60 *
          60 *
          1000,
    ).toISOString()

  const {
    data: invitation,
    error: insertError,
  } = await admin
    .from(
      "company_invitations",
    )
    .insert({
      company_id:
        gate.companyId,

      email,
      role,
      permissions,

      status: "pending",

      invited_by:
        gate.user.id,

      expires_at:
        expiresAt,
    })
    .select(
      `
        id,
        email,
        role,
        permissions,
        status,
        invited_at,
        expires_at
      `,
    )
    .single()

  if (insertError) {
    if (
      insertError.code ===
      "23505"
    ) {
      return NextResponse.json(
        {
          error:
            "A pending invitation already exists for this email address.",
        },
        { status: 409 },
      )
    }

    console.error(
      "Unable to create company invitation:",
      insertError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to create invitation.",
      },
      { status: 500 },
    )
  }

  /*
   * Supabase sends the actual invitation email.
   *
   * We attach only the invitation identifier.
   * The acceptance endpoint will independently
   * verify authenticated email + company invite.
   */
  const requestOrigin =
  new URL(request.url).origin

const appUrl =
  process.env.NODE_ENV === "production"
    ? (
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://teamrocket.markets"
      ).replace(/\/$/, "")
    : requestOrigin

const acceptPath =
  `/business/team/accept?invitation=${encodeURIComponent(
    invitation.id,
  )}`

const redirectTo =
  `${appUrl}/auth/callback?redirect=${encodeURIComponent(
    acceptPath,
  )}`

console.log(
  "TEAM INVITE redirectTo:",
  redirectTo,
)
  const {
    error: inviteError,
  } =
  
    await admin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,

        data: {
          company_invitation_id:
            invitation.id,

          company_id:
            gate.companyId,

          company_name:
            company.name,
        },
      },
    )

  if (inviteError) {
    /*
     * Don't leave a fake pending invitation consuming
     * a seat when email delivery failed.
     */
    await admin
      .from(
        "company_invitations",
      )
      .delete()
      .eq(
        "id",
        invitation.id,
      )
      .eq(
        "company_id",
        gate.companyId,
      )

    console.error(
      "Supabase invitation failed:",
      inviteError,
    )

    return NextResponse.json(
      {
        error:
          inviteError.message ||
          "Unable to send invitation email.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      invitation,
    },
    { status: 201 },
  )
}
