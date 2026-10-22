import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { getCompanyMembership, type CompanyRole } from "@/lib/company-auth"
import { isSuperAdmin } from "@/lib/platform-auth"

export type AccountType = "individual" | "business" | "super_admin"

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
 *   Platform administration only.
 *   Normal tenant-data routes do NOT automatically expose
 *   every company's data.
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

  /*
   * Platform authority is deliberately checked first.
   *
   * A super admin remains a platform account even if someone
   * accidentally creates a company_members row for that user.
   */
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

  /*
   * No company membership = existing individual collector.
   *
   * This preserves all current personal accounts and their
   * existing inventory ownership.
   */
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
 * Returns the ownership filter(s) that MUST be applied to a
 * tenant-data query.
 *
 * Super admins intentionally receive no automatic tenant filter.
 * Callers should reject the super_admin scope unless they are
 * implementing an explicit platform-admin workflow.
 *
 * For normal collection/business routes, however, a super admin
 * should behave like an individual account so they can still
 * access their own inventory and analytics without being forced
 * into a business tenant.
 */
export function scopeFilters(scope: DataScope): string[] {
  if (scope.kind === "individual") {
    return [`user_id=eq.${scope.userId}`, "company_id=is.null"]
  }

  if (scope.kind === "company") {
    return [`company_id=eq.${scope.companyId}`, "user_id=is.null"]
  }

  // Normal collection and analytics flows should stay scoped to the
  // super admin's own personal ownership rather than to a company or
  // all tenant data.
  return [`user_id=eq.${scope.userId}`, "company_id=is.null"]
}

/**
 * Apply strict ownership filters to a Supabase query.
 *
 * We intentionally also require the opposite owner column to
 * be NULL. This matches the database ownership model and makes
 * the tenant boundary explicit in every normal inventory query.
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

  // Super admins should still create personal records rather than
  // forcing a business tenant context.
  return {
    user_id: scope.userId,
    company_id: null,
  }
}

/**
 * Normal inventory routes should not silently turn a super admin
 * into a cross-tenant inventory user.
 */
export function tenantScopeRequiredResponse(scope: DataScope) {
  if (scope.kind !== "super_admin") {
    return null
  }

  // For collection and inventory flows, the super admin is treated as
  // their own personal account; only explicit platform admin workflows
  // should reject this path.
  return null
}
