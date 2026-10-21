import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import {
  getCompanyMembership,
  type CompanyRole,
} from "@/lib/company-auth"
import {
  isSuperAdmin,
} from "@/lib/platform-auth"

export type AccountType =
  | "individual"
  | "business"
  | "super_admin"

export type DataScope =
  | {
      kind: "individual"
      accountType: "individual"
      userId: string
      companyId: null
      companyRole: null
      isSuperAdmin: false
    }
  | {
      kind: "company"
      accountType: "business"
      userId: string
      companyId: string
      companyRole: CompanyRole
      isSuperAdmin: false
    }
  | {
      kind: "super_admin"
      accountType: "super_admin"
      userId: string
      companyId: null
      companyRole: null
      isSuperAdmin: true
    }

export type ScopeFilter =
  | {
      column: "user_id"
      value: string
    }
  | {
      column: "company_id"
      value: string
    }

/**
 * Resolve the signed-in user's data ownership context.
 *
 * IMPORTANT:
 *
 * Individual collector:
 *   inventory_items.user_id = user.id
 *   inventory_items.company_id = NULL
 *
 * Business member:
 *   inventory_items.user_id = NULL
 *   inventory_items.company_id = membership.companyId
 *
 * Super admin:
 *   Normal collection, inventory, and analytics routes should still resolve to
 *   the super admin's personal ownership instead of a company tenant or no
 *   tenant at all. Only explicit platform-admin workflows should project them
 *   through a different scope.
 */
export async function resolveDataScope(
  suppliedUser?: User | null,
): Promise<DataScope | NextResponse> {
  const supabase = await createClient()

  let user = suppliedUser ?? null

  if (!user) {
    const {
      data: { user: authenticatedUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authenticatedUser) {
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

    user = authenticatedUser
  }

  // Platform authority is checked first, but for ordinary inventory/analytics
  // flows we still want a normal personal ownership scope rather than a vacant
  // tenant scope.
  if (await isSuperAdmin(user)) {
    return {
      kind: "super_admin",
      accountType: "super_admin",
      userId: user.id,
      companyId: null,
      companyRole: null,
      isSuperAdmin: true,
    }
  }

  const membership = await getCompanyMembership(user.id)

  if (membership) {
    return {
      kind: "company",
      accountType: "business",
      userId: user.id,
      companyId: membership.companyId,
      companyRole: membership.role,
      isSuperAdmin: false,
    }
  }

  return {
    kind: "individual",
    accountType: "individual",
    userId: user.id,
    companyId: null,
    companyRole: null,
    isSuperAdmin: false,
  }
}

/**
 * Returns the ownership filter(s) that MUST be applied to a tenant-data query.
 *
 * For super admins we intentionally scope to their own personal account because
 * ordinary collection/analytics access is not a cross-tenant view.
 */
export function scopeFilters(scope: DataScope): string[] {
  if (scope.kind === "individual") {
    return [
      `user_id=eq.${scope.userId}`,
      "company_id=is.null",
    ]
  }

  if (scope.kind === "company") {
    return [
      `company_id=eq.${scope.companyId}`,
      "user_id=is.null",
    ]
  }

  // Super admin fallback: keep them scoped to their own inventory, not no scope.
  return [
    `user_id=eq.${scope.userId}`,
    "company_id=is.null",
  ]
}

/**
 * Apply strict ownership filters to a Supabase query.
 */
export function applyScopeFilters<
  T extends {
    eq: (column: string, value: string) => T
    is: (column: string, value: null) => T
  },
>(query: T, scope: DataScope): T {
  if (scope.kind === "individual") {
    return query.eq("user_id", scope.userId).is("company_id", null)
  }

  if (scope.kind === "company") {
    return query.eq("company_id", scope.companyId).is("user_id", null)
  }

  return query.eq("user_id", scope.userId).is("company_id", null)
}

/**
 * Ownership columns used when creating new tenant records.
 */
export function ownerStamp(scope: DataScope) {
  if (scope.kind === "individual") {
    return {
      user_id: scope.userId,
      company_id: null,
    }
  }

  if (scope.kind === "company") {
    return {
      user_id: null,
      company_id: scope.companyId,
    }
  }

  // Super admins still create personal ownership records, never cross-tenant rows.
  return {
    user_id: scope.userId,
    company_id: null,
  }
}

/**
 * Normal inventory routes should not silently turn a super admin into a
 * cross-tenant inventory user.
 */
export function tenantScopeRequiredResponse(scope: DataScope) {
  if (scope.kind !== "super_admin") {
    return null
  }

  // For normal collection/inventory analytics flows, a super admin is treated as
  // a personal account. Only explicit platform-admin operations should reject.
  return null
}
