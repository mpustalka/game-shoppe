import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const PAYMENT_METHODS = new Set([
  "paypal",
  "venmo",
  "cash_app",
  "zelle",
  "stripe_link",
  "cash_local",
  "trade_only",
])

const SHIPPING_METHODS = new Set([
  "envelope",
  "ground_advantage",
  "local_pickup",
  "seller_arranged",
])

function strings(value: unknown, allowed: Set<string>) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value.filter(
        (entry): entry is string =>
          typeof entry === "string" && allowed.has(entry),
      ),
    ),
  )
}

function optionalText(value: unknown, max: number) {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text ? text.slice(0, max) : null
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    profile: data ?? {
      user_id: user.id,
      display_name: null,
      bio: null,
      payment_methods: [],
      payment_note: null,
      shipping_methods: [],
      shipping_note: null,
      ships_us_only: true,
      local_pickup: false,
    },
  })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  const row = {
    user_id: user.id,
    display_name: optionalText(body?.displayName, 80),
    bio: optionalText(body?.bio, 500),
    payment_methods: strings(body?.paymentMethods, PAYMENT_METHODS),
    payment_note: optionalText(body?.paymentNote, 300),
    shipping_methods: strings(body?.shippingMethods, SHIPPING_METHODS),
    shipping_note: optionalText(body?.shippingNote, 300),
    ships_us_only: body?.shipsUsOnly !== false,
    local_pickup: body?.localPickup === true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("seller_profiles")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ profile: data })
}