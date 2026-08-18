import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { ADMIN_EMAIL } from "@/lib/auth"
import { getActiveSubscription } from "@/lib/subscription-server"

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

  subscriptionPlan: "basic" | "premium" | null
  paidUntil: string | null

  bannedUntil: string | null
}

function toView(
  user: {
    id: string
    email?: string
    created_at: string
    last_sign_in_at?: string | null
    email_confirmed_at?: string | null
    banned_until?: string | null
    user_metadata?: Record<string, unknown>
  },
  subscription?: {
    paidPlan: "basic" | "premium" | null
    paidUntil: string | null
  },
): AdminUserView {
  const meta = user.user_metadata ?? {}

  const email = user.email ?? null

  return {
    id: user.id,

    email,

    storeName: (meta.store_name as string | undefined) ?? null,

    companyId: (meta.company_id as string | undefined) ?? null,

    /**
     * Only the platform owner email is considered admin.
     * Ignore metadata flags completely.
     */
    isAdmin: email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase(),

    confirmed: Boolean(user.email_confirmed_at),

    createdAt: user.created_at,

    lastSignInAt: user.last_sign_in_at ?? null,

    subscriptionPlan: subscription?.paidPlan ?? null,

    paidUntil: subscription?.paidUntil ?? null,

    bannedUntil: user.banned_until ?? null,
  }
}

/**
 * GET /api/admin/users
 *
 * Lists every account.
 *
 * OWNER ADMIN ONLY.
 */
export async function GET() {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.listUsers({
      perPage: 200,
    })

    if (error) {
      throw error
    }

    const users = await Promise.all(
      data.users.map(async (user) => {
        const subscription = await getActiveSubscription(user.id).catch(() => ({
          paidPlan: null,

          paidUntil: null,
        }))

        return toView(user, subscription)
      }),
    )

    return NextResponse.json({
      users,
    })
  } catch (error) {
    console.error("Admin user list failed:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load users",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * POST /api/admin/users
 *
 * Creates a normal end-user account.
 *
 * This endpoint intentionally cannot create another administrator.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const body = await request.json().catch(() => null)

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  const password = typeof body?.password === "string" ? body.password : ""

  const storeName =
    typeof body?.storeName === "string" ? body.storeName.trim() : ""

  const companyId =
    typeof body?.companyId === "string" ? body.companyId.trim() : ""

  if (!email || !password) {
    return NextResponse.json(
      {
        error: "Email and password are required",
      },
      {
        status: 400,
      },
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        error: "Password must be at least 8 characters",
      },
      {
        status: 400,
      },
    )
  }

  /**
   * Prevent creating another account using the protected
   * owner/admin email.
   */
  if (email === ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json(
      {
        error: "The owner administrator email is reserved.",
      },
      {
        status: 409,
      },
    )
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.createUser({
      email,

      password,

      email_confirm: true,

      user_metadata: {
        store_name: storeName || undefined,

        company_id: companyId || undefined,

        /**
         * Never create additional admin users.
         */
        is_admin: undefined,
      },
    })

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      )
    }

    return NextResponse.json(
      {
        user: toView(data.user),
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error("Admin user creation failed:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create user",
      },
      {
        status: 500,
      },
    )
  }
}
