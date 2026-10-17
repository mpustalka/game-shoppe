import { NextResponse } from "next/server"

import {
  requireCompanyPermission,
} from "@/lib/company-auth"
import {
  resolveBusinessPermissions,
} from "@/lib/business-permissions"
import {
  createAdminClient,
} from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate =
    await requireCompanyPermission(
      "team.view",
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

  const admin = createAdminClient()

  const {
    data: company,
    error: companyError,
  } = await admin
    .from("companies")
    .select(
      `
        id,
        name,
        subscription_status,
        subscription_plan,
        trial_plan,
        included_seats
      `,
    )
    .eq("id", gate.companyId)
    .single()

  if (companyError || !company) {
    console.error(
      "Team company lookup failed:",
      companyError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load business",
      },
      { status: 500 },
    )
  }

  const {
    data: members,
    error: memberError,
  } = await admin
    .from("company_members")
    .select(
      `
        id,
        user_id,
        role,
        status,
        permissions,
        invited_by,
        invited_at,
        joined_at,
        created_at,
        updated_at
      `,
    )
    .eq("company_id", gate.companyId)
    .neq("status", "removed")
    .order("created_at", {
      ascending: true,
    })

  if (memberError) {
    console.error(
      "Team member lookup failed:",
      memberError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load team members",
      },
      { status: 500 },
    )
  }

  const {
    data: invitations,
    error: invitationError,
  } = await admin
    .from("company_invitations")
    .select(
      `
        id,
        email,
        role,
        permissions,
        status,
        invited_by,
        invited_at,
        expires_at,
        accepted_at
      `,
    )
    .eq("company_id", gate.companyId)
    .eq("status", "pending")
    .order("invited_at", {
      ascending: false,
    })

  if (invitationError) {
    console.error(
      "Team invitation lookup failed:",
      invitationError,
    )

    return NextResponse.json(
      {
        error:
          "Unable to load invitations",
      },
      { status: 500 },
    )
  }

  /*
   * company_members stores Auth user IDs rather
   * than duplicate email/profile information.
   *
   * Resolve those users through the Admin API.
   */
  const resolvedMembers =
    await Promise.all(
      (members ?? []).map(
        async (member) => {
          const {
            data: authData,
          } =
            await admin.auth.admin.getUserById(
              member.user_id,
            )

          const authUser =
            authData?.user

          const email =
            authUser?.email ?? null

          const metadata =
            authUser?.user_metadata ??
            {}

          const fullName =
            typeof metadata.full_name ===
            "string"
              ? metadata.full_name
              : typeof metadata.name ===
                  "string"
                ? metadata.name
                : null

          return {
            id: member.id,

            userId:
              member.user_id,

            email,

            fullName,

            role:
              member.role,

            status:
              member.status,

            permissions:
              resolveBusinessPermissions(
                member.role,
                member.permissions,
              ),

            permissionOverrides:
              member.permissions ?? {},

            invitedBy:
              member.invited_by,

            invitedAt:
              member.invited_at,

            joinedAt:
              member.joined_at,

            createdAt:
              member.created_at,

            updatedAt:
              member.updated_at,

            isCurrentUser:
              member.user_id ===
              gate.user.id,
          }
        },
      ),
    )

  /*
   * Seats are consumed by active/suspended members
   * and pending invitations.
   *
   * Removed memberships do not consume seats.
   */
  const memberSeatCount =
    (members ?? []).filter(
      (member) =>
        member.status !== "removed",
    ).length

  const invitationSeatCount =
    (invitations ?? []).length

  const seatsUsed =
    memberSeatCount +
    invitationSeatCount

  const includedSeats =
    Math.max(
      1,
      Number(
        company.included_seats,
      ) || 1,
    )

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,

      subscriptionStatus:
        company.subscription_status,

      subscriptionPlan:
        company.subscription_plan,

      trialPlan:
        company.trial_plan,
    },

    currentUser: {
      id: gate.user.id,

      role:
        gate.companyRole,

      canManageTeam:
        gate.isSuperAdmin ||
        Boolean(
          gate.membership &&
            resolveBusinessPermissions(
              gate.membership.role,
              gate.membership
                .permissions,
            )["team.manage"],
        ),
    },

    seats: {
      included: includedSeats,
      used: seatsUsed,

      available:
        Math.max(
          0,
          includedSeats -
            seatsUsed,
        ),
    },

    members:
      resolvedMembers,

    invitations:
      invitations ?? [],
  })
}
