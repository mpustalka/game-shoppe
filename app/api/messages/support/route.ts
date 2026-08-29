import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,updated_at,resolved_at")
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const subject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const category =
    typeof body?.category === "string" ? body.category : "general"
  const message = typeof body?.message === "string" ? body.message.trim() : ""

  if (subject.length < 3 || !message) {
    return NextResponse.json(
      { error: "Enter a subject and message" },
      { status: 400 },
    )
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject,
      category,
      status: "open",
    })
    .select("id")
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json(
      { error: ticketError?.message || "Unable to create ticket" },
      { status: 400 },
    )
  }

  const { error: messageError } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_role: "user",
      body: message,
    })

  if (messageError) {
    return NextResponse.json(
      { error: messageError.message },
      { status: 400 },
    )
  }

  return NextResponse.json({ ticketId: ticket.id }, { status: 201 })
}