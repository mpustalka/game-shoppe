import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function displayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const store = user.user_metadata?.store_name

  if (typeof store === "string" && store.trim()) {
    return store.trim()
  }

  const email = user.email ?? ""
  return email.includes("@") ? email.split("@")[0] : "Collector"
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const query =
    new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? ""

  const admin = createAdminClient()
  const {
    data: { users },
    error,
  } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = users
    .filter((candidate) => candidate.id !== user.id)
    .map((candidate) => ({
      id: candidate.id,
      displayName: displayName(candidate),
    }))
    .filter((candidate) =>
      query
        ? candidate.displayName.toLowerCase().includes(query)
        : true,
    )
    .slice(0, 30)

  return NextResponse.json({ users: results })
}