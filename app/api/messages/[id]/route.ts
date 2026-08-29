import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

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

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,created_at,edited_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id)

  return NextResponse.json({
    conversationId: id,
    currentUserId: user.id,
    messages: messages ?? [],
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
    return NextResponse.json({ error: "Enter a message" }, { status: 400 })
  }

  if (message.length > 4000) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      body: message,
    })
    .select("id,conversation_id,sender_id,body,created_at,edited_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: data }, { status: 201 })
}