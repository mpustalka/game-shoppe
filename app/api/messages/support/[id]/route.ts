import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isAdminUser } from "@/lib/auth"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const [{ data: ticket, error: ticketError }, { data: messages, error: messageError }] =
    await Promise.all([
      supabase
        .from("support_tickets")
        .select("id,user_id,subject,category,status,priority,created_at,updated_at,resolved_at")
        .eq("id", id)
        .maybeSingle(),

      supabase
        .from("support_messages")
        .select("id,ticket_id,sender_id,sender_role,body,created_at")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true }),
    ])

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Support ticket not found" }, { status: 404 })
  }

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 })
  }

  return NextResponse.json({
    ticket,
    messages: messages ?? [],
    currentUserId: user.id,
    isAdmin: isAdminUser(user),
  })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const message =
    typeof body?.body === "string" ? body.body.trim() : ""

  if (!message) {
    return NextResponse.json({ error: "Enter a reply" }, { status: 400 })
  }

  const admin = isAdminUser(user)

  const { error } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: id,
      sender_id: user.id,
      sender_role: admin ? "admin" : "user",
      body: message,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase
    .from("support_tickets")
    .update({
      status: admin ? "waiting_on_user" : "waiting_on_support",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const status =
    typeof body?.status === "string" ? body.status : ""

  if (!["open", "waiting_on_user", "waiting_on_support", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}