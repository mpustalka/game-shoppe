import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { resolveDataScope, type DataScope } from "@/lib/user-scope"

export const ACTIVE_INVENTORY_TENANT_COOKIE = "active_inventory_tenant"

/**
 * Resolve inventory ownership. Super-admins must explicitly select a company;
 * their selected company is validated against the companies table on every
 * request, so a stale or forged cookie cannot grant access to an arbitrary ID.
 */
export async function resolveInventoryScope(): Promise<DataScope | NextResponse> {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse || scope.kind !== "super_admin") {
    return scope
  }

  const cookieStore = await cookies()
  const companyId = cookieStore.get(ACTIVE_INVENTORY_TENANT_COOKIE)?.value

  if (!companyId) {
    return NextResponse.json(
      {
        error: "Select a company before accessing inventory.",
        code: "tenant_context_required",
      },
      { status: 403 },
    )
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

    if (!company) {
      return NextResponse.json(
        {
          error: "The selected company no longer exists. Please select a company again.",
          code: "tenant_context_invalid",
        },
        { status: 403 },
      )
    }

    // This company-scoped context is used only by inventory routes.
    // Other platform-admin routes continue to use the original super-admin scope.
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
