import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  resolveDataScope,
  type DataScope,
} from "@/lib/user-scope"

// Set by /api/admin/active-tenant when a super admin picks a company to manage.
export const ACTIVE_INVENTORY_TENANT_COOKIE = "active_inventory_tenant"

/**
 * Resolve the data ownership scope used by inventory, binder, and analytics
 * routes.
 *
 * Business users:
 *   Inventory belongs to their company.
 *
 * Individual users:
 *   Inventory belongs to their user account.
 *
 * Super-admin users:
 *   By default, inventory belongs to their own user account — not to a
 *   company and not to all tenants. If they explicitly selected a company on
 *   /admin/inventory, that company's inventory is used instead. The selection
 *   is re-validated against the companies table on every request, so a stale
 *   or forged cookie cannot grant access to an arbitrary id.
 *
 *   Platform privileges in other admin endpoints are unchanged.
 */
export async function resolveInventoryScope(): Promise<
  DataScope | NextResponse
> {
  const scope = await resolveDataScope()

  if (
    scope instanceof NextResponse ||
    scope.kind !== "super_admin"
  ) {
    return scope
  }

  const personal: DataScope = {
    kind: "individual",
    accountType: "individual",
    userId: scope.userId,
    companyId: null,
    companyRole: null,
    isSuperAdmin: false,
  }

  const cookieStore = await cookies()
  const companyId =
    cookieStore.get(ACTIVE_INVENTORY_TENANT_COOKIE)?.value

  if (!companyId) {
    return personal
  }

  try {
    const admin = createAdminClient()
    const { data: company, error } = await admin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle()

    if (error) {
      console.error("Unable to validate selected inventory tenant:", error)
      return NextResponse.json(
        {
          error: "Unable to validate the selected company.",
          code: "tenant_validation_failed",
        },
        { status: 500 },
      )
    }

    // The company was deleted since it was picked — fall back to personal.
    if (!company) {
      return personal
    }

    return {
      kind: "company",
      accountType: "business",
      userId: scope.userId,
      companyId: company.id,
      companyRole: "owner",
      isSuperAdmin: false,
    }
  } catch (error) {
    console.error("Unable to resolve selected inventory tenant:", error)
    return NextResponse.json(
      {
        error: "Unable to validate the selected company.",
        code: "tenant_validation_failed",
      },
      { status: 500 },
    )
  }
}
