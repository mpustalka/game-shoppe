import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type AdminUserView = {
  id: string
  email: string | null
  storeName: string | null
  companyId: string | null
  isAdmin: boolean
  confirmed: boolean
  createdAt: string
  lastSignInAt: string | null
}

function toView(user: {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown>
}): AdminUserView {
  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? null,
    storeName: (meta.store_name as string | undefined) ?? null,
    companyId: (meta.company_id as string | undefined) ?? null,
    isAdmin: meta.is_admin === true,
    confirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}

// GET /api/admin/users — list every account (admin only).
export async function GET() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data.users.map(toView) })
}

// POST /api/admin/users — create a new end-user account (admin only).
export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const storeName = typeof body?.storeName === "string" ? body.storeName.trim() : ""
  const companyId = typeof body?.companyId === "string" ? body.companyId : ""
  const makeAdmin = body?.isAdmin === true

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // admin-created accounts skip the email confirmation step
    user_metadata: {
      store_name: storeName || undefined,
      company_id: companyId || undefined,
      is_admin: makeAdmin || undefined,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: toView(data.user) }, { status: 201 })
}
