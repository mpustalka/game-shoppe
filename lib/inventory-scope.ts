import { NextResponse } from "next/server"

import {
  resolveDataScope,
  type DataScope,
} from "@/lib/user-scope"

/**
 * Resolve the data ownership scope used by inventory routes.
 *
 * Business users:
 *   Inventory belongs to their company.
 *
 * Individual users:
 *   Inventory belongs to their user account.
 *
 * Super-admin users:
 *   Platform privileges remain unchanged elsewhere.
 *   For ordinary inventory operations, inventory belongs to
 *   their own user account—not to a company and not to all tenants.
 */
export async function resolveInventoryScope(): Promise<
  DataScope | NextResponse
> {
  const scope = await resolveDataScope()

  if (scope instanceof NextResponse) {
    return scope
  }

  // Business users retain their company ownership and role.
  if (scope.kind === "company") {
    return scope
  }

  // Individual users already have the correct personal scope.
  if (scope.kind === "individual") {
    return scope
  }

  // Project the super-admin identity into personal ownership
  // ONLY for callers using this inventory-specific resolver.
  //
  // This does not change the user's actual platform role or
  // their authorization in other admin endpoints.
  return {
    kind: "individual",
    accountType: "individual",
    userId: scope.userId,
    companyId: null,
    companyRole: null,
    isSuperAdmin: false,
  }
}