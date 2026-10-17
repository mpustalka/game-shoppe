import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  isSuperAdmin,
} from "@/lib/platform-auth"

import {
  hasBusinessPermission,
  type BusinessPermission,
} from "@/lib/business-permissions"

export type CompanyRole =
  | "owner"
  | "manager"
  | "employee"

export type CompanyMemberStatus =
  | "invited"
  | "active"
  | "suspended"
  | "removed"

export type CompanyMembership = {
  id: string
  companyId: string
  userId: string
  role: CompanyRole
  status: CompanyMemberStatus
  permissions: Record<
    string,
    unknown
  >
}

const ROLE_LEVEL: Record<
  CompanyRole,
  number
> = {
  employee: 1,
  manager: 2,
  owner: 3,
}

export async function getCompanyMembership(
  userId: string,
  companyId?: string,
): Promise<CompanyMembership | null> {
  const supabase = await createClient()

  let query = supabase
    .from("company_members")
    .select(
      `
        id,
        company_id,
        user_id,
        role,
        status,
        permissions
      `,
    )
    .eq("user_id", userId)
    .eq("status", "active")

  if (companyId) {
    query = query.eq(
      "company_id",
      companyId,
    )
  }

  const {
    data,
    error,
  } = await query
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(
      "Unable to resolve company membership:",
      error,
    )

    return null
  }

  if (!data) {
    return null
  }

  if (
    data.role !== "owner" &&
    data.role !== "manager" &&
    data.role !== "employee"
  ) {
    return null
  }

  return {
    id: data.id,
    companyId: data.company_id,
    userId: data.user_id,
    role: data.role,
    status:
      data.status as CompanyMemberStatus,
    permissions:
      data.permissions &&
      typeof data.permissions ===
        "object"
        ? data.permissions
        : {},
  }
}

export function companyRoleAtLeast(
  actual: CompanyRole,
  required: CompanyRole,
) {
  return (
    ROLE_LEVEL[actual] >=
    ROLE_LEVEL[required]
  )
}

async function requireCompanyRole(
  requiredRole: CompanyRole,
  companyId?: string,
) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      {
        error: "Not signed in",
        code: "auth_required",
      },
      {
        status: 401,
      },
    )
  }

  /*
   * Super admins may operate across companies.
   *
   * If a specific company was requested, return that company
   * context even though the super admin does not need a
   * company_members record.
   */
  if (await isSuperAdmin(user)) {
    return {
      user,
      membership: null,
      companyId:
        companyId ?? null,
      companyRole:
        null,
      isSuperAdmin: true as const,
    }
  }

  const membership =
    await getCompanyMembership(
      user.id,
      companyId,
    )

  if (!membership) {
    return NextResponse.json(
      {
        error:
          "Business membership required",
        code:
          "company_membership_required",
      },
      {
        status: 403,
      },
    )
  }

  if (
    !companyRoleAtLeast(
      membership.role,
      requiredRole,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to perform this business action",
        code:
          "company_role_required",
      },
      {
        status: 403,
      },
    )
  }

  return {
    user,
    membership,
    companyId:
      membership.companyId,
    companyRole:
      membership.role,
    isSuperAdmin: false as const,
  }
}

export async function requireCompanyMember(
  companyId?: string,
) {
  return requireCompanyRole(
    "employee",
    companyId,
  )
}

export async function requireCompanyManager(
  companyId?: string,
) {
  return requireCompanyRole(
    "manager",
    companyId,
  )
}

export async function requireCompanyOwner(
  companyId?: string,
) {
  return requireCompanyRole(
    "owner",
    companyId,
  )
}
/**
 * Require a granular business permission.
 *
 * Super admins are allowed only when they are operating
 * with an explicit company context.
 *
 * Normal business users must:
 * - be authenticated
 * - have an active company membership
 * - possess the requested permission
 */
export async function requireCompanyPermission(
  permission: BusinessPermission,
  companyId?: string,
) {
  const gate =
    await requireCompanyMember(
      companyId,
    )

  if (
    gate instanceof NextResponse
  ) {
    return gate
  }

  /*
   * A platform super admin must explicitly select a company
   * before using tenant-owned business APIs.
   */
  if (gate.isSuperAdmin) {
    if (!gate.companyId) {
      return NextResponse.json(
        {
          error:
            "Select a business before accessing this resource.",
          code:
            "company_context_required",
        },
        {
          status: 403,
        },
      )
    }

    return {
      ...gate,
      permission,
      allowed: true as const,
    }
  }

  if (
    !gate.membership ||
    !gate.companyRole
  ) {
    return NextResponse.json(
      {
        error:
          "Business membership required",
        code:
          "company_membership_required",
      },
      {
        status: 403,
      },
    )
  }

  const allowed =
    hasBusinessPermission(
      gate.companyRole,
      gate.membership.permissions,
      permission,
    )

  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to perform this business action.",
        code:
          "business_permission_required",
        permission,
      },
      {
        status: 403,
      },
    )
  }

  return {
    ...gate,
    permission,
    allowed: true as const,
  }
}
