import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

export type PlatformRole =
  | "user"
  | "super_admin"

export type PlatformAdmin = {
  userId: string
  role: "super_admin"
  active: boolean
}

/**
 * Checks platform_admins using the authenticated user's ID.
 *
 * IMPORTANT:
 * This is PLATFORM authorization.
 * Business owner/manager/employee permissions do not belong here.
 */
export async function getPlatformAdmin(
  userId: string,
): Promise<PlatformAdmin | null> {
  const supabase = await createClient()

  const {
    data,
    error,
  } = await supabase
    .from("platform_admins")
    .select("user_id, role, active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()

  if (error) {
    console.error(
      "Unable to resolve platform admin:",
      error,
    )

    return null
  }

  if (
    !data ||
    data.role !== "super_admin"
  ) {
    return null
  }

  return {
    userId: data.user_id,
    role: "super_admin",
    active: data.active,
  }
}

export async function isSuperAdmin(
  userOrId:
    | User
    | string
    | null
    | undefined,
): Promise<boolean> {
  if (!userOrId) {
    return false
  }

  const userId =
    typeof userOrId === "string"
      ? userOrId
      : userOrId.id

  const admin =
    await getPlatformAdmin(userId)

  return admin !== null
}

/**
 * Server/API guard for PLATFORM administration.
 *
 * Usage:
 *
 * const gate = await requireSuperAdmin()
 * if (gate instanceof NextResponse) return gate
 *
 * const { user } = gate
 */
export async function requireSuperAdmin() {
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

  const allowed =
    await isSuperAdmin(user)

  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Platform administrator access required",
        code: "super_admin_required",
      },
      {
        status: 403,
      },
    )
  }

  return {
    user,
    platformRole:
      "super_admin" as const,
  }
}
