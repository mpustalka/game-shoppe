import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isAdminUser } from "@/lib/auth"

export async function requireAdmin() {
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

  if (!isAdminUser(user)) {
    return NextResponse.json(
      {
        error: "Administrator access required",
        code: "admin_required",
      },
      {
        status: 403,
      },
    )
  }

  return {
    user,
  }
}
