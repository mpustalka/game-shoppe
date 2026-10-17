/**
 * Compatibility wrapper for existing platform-admin APIs.
 *
 * Do not use this for business/company authorization.
 */

import {
  requireSuperAdmin,
} from "@/lib/platform-auth"

export async function requireAdmin() {
  return requireSuperAdmin()
}
