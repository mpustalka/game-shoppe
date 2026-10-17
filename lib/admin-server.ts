/**
 * Compatibility wrapper.
 *
 * Existing admin routes can continue importing:
 *
 *   import { requireAdmin } from "@/lib/admin-server"
 *
 * Platform authority is now determined by public.platform_admins.
 *
 * Business owners/managers/employees NEVER pass this guard
 * unless they are separately registered as platform super admins.
 */

import {
  requireSuperAdmin,
} from "@/lib/platform-auth"

export async function requireAdmin() {
  return requireSuperAdmin()
}
