import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isAdminUser } from "@/lib/auth"

// Guard for admin-only route handlers. Resolves the signed-in user from the
// request cookies and confirms they are the platform admin. On failure it
// returns a ready-to-send NextResponse (401/403); on success it returns the
// authenticated user. Usage:
//
//   const gate = await requireAdmin()
//   if (gate instanceof NextResponse) return gate
//   const { user } = gate
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  return { user }
}
