import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { easyshipRequest } from "@/lib/easyship"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not signed in" },
        { status: 401 },
      )
    }

    const data = await easyshipRequest<unknown>(
      "/item_categories?per_page=100",
      {
        method: "GET",
      },
    )

    console.log(
      "EASYSHIP ITEM CATEGORIES:",
      JSON.stringify(data, null, 2),
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error(
      "Easyship categories exception:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve Easyship item categories",
      },
      { status: 500 },
    )
  }
}