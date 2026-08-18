import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type CompanyRow = {
  id: string
  name: string
  created_at: string
}

/**
 * GET /api/admin/companies
 *
 * List all companies.
 * Owner admin only.
 */
export async function GET() {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("companies")
      .select("id,name,created_at")
      .order("created_at", {
        ascending: true,
      })

    if (error) {
      throw error
    }

    /**
     * Count how many Auth users are assigned
     * to each company.
     */
    const { data: userData, error: userError } =
      await admin.auth.admin.listUsers({
        perPage: 1000,
      })

    if (userError) {
      throw userError
    }

    const userCounts = new Map<string, number>()

    for (const user of userData.users) {
      const companyId =
        typeof user.user_metadata?.company_id === "string"
          ? user.user_metadata.company_id
          : null

      if (!companyId) continue

      userCounts.set(companyId, (userCounts.get(companyId) ?? 0) + 1)
    }

    const companies = ((data ?? []) as CompanyRow[]).map((company) => ({
      ...company,

      userCount: userCounts.get(company.id) ?? 0,
    }))

    return NextResponse.json({
      companies,
    })
  } catch (error) {
    console.error("Admin companies GET failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load companies",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * POST /api/admin/companies
 *
 * Create a new company.
 */
export async function POST(request: Request) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const body = await request.json().catch(() => null)

  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json(
      {
        error: "Company name is required",
      },
      {
        status: 400,
      },
    )
  }

  if (name.length > 120) {
    return NextResponse.json(
      {
        error: "Company name must be 120 characters or less",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("companies")
      .insert({
        name,
      })
      .select("id,name,created_at")
      .single()

    if (error) {
      const message =
        error.code === "23505" ? "That company already exists" : error.message

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 400,
        },
      )
    }

    return NextResponse.json(
      {
        company: {
          ...(data as CompanyRow),

          userCount: 0,
        },
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    console.error("Admin company POST failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create company",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * PATCH /api/admin/companies
 *
 * Rename a company.
 *
 * Body:
 *
 * {
 *   id: "...",
 *   name: "New Company Name"
 * }
 */
export async function PATCH(request: Request) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const body = await request.json().catch(() => null)

  const id = typeof body?.id === "string" ? body.id.trim() : ""

  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!id) {
    return NextResponse.json(
      {
        error: "Company id is required",
      },
      {
        status: 400,
      },
    )
  }

  if (!name) {
    return NextResponse.json(
      {
        error: "Company name is required",
      },
      {
        status: 400,
      },
    )
  }

  if (name.length > 120) {
    return NextResponse.json(
      {
        error: "Company name must be 120 characters or less",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from("companies")
      .update({
        name,
      })
      .eq("id", id)
      .select("id,name,created_at")
      .single()

    if (error) {
      const message =
        error.code === "23505"
          ? "That company name already exists"
          : error.message

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 400,
        },
      )
    }

    return NextResponse.json({
      ok: true,

      company: data as CompanyRow,
    })
  } catch (error) {
    console.error("Admin company PATCH failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update company",
      },
      {
        status: 500,
      },
    )
  }
}

/**
 * DELETE /api/admin/companies?id=...
 *
 * Delete a company.
 *
 * Safety:
 * Company cannot be deleted while users
 * are still assigned to it.
 */
export async function DELETE(request: Request) {
  const gate = await requireAdmin()

  if (gate instanceof NextResponse) {
    return gate
  }

  const url = new URL(request.url)

  const id = url.searchParams.get("id")?.trim() ?? ""

  if (!id) {
    return NextResponse.json(
      {
        error: "Company id is required",
      },
      {
        status: 400,
      },
    )
  }

  try {
    const admin = createAdminClient()

    /**
     * Check all Auth users first.
     *
     * We don't want to delete a company
     * while user metadata still references it.
     */
    const { data: userData, error: userError } =
      await admin.auth.admin.listUsers({
        perPage: 1000,
      })

    if (userError) {
      throw userError
    }

    const assignedUsers = userData.users.filter(
      (user) => user.user_metadata?.company_id === id,
    )

    if (assignedUsers.length > 0) {
      return NextResponse.json(
        {
          error: `This company still has ${assignedUsers.length} user${
            assignedUsers.length === 1 ? "" : "s"
          } assigned to it. Move or remove those users first.`,

          userCount: assignedUsers.length,
        },
        {
          status: 409,
        },
      )
    }

    const { error } = await admin.from("companies").delete().eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error("Admin company DELETE failed:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete company",
      },
      {
        status: 500,
      },
    )
  }
}
