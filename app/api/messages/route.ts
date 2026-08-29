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

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("conversation_members")
    .select("conversation_id,last_read_at")
    .eq("user_id", user.id)

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    )
  }

  const ids = (memberships ?? []).map((row) => row.conversation_id)

  if (ids.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  const [{ data: conversations }, { data: members }, { data: messages }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id,kind,created_at,updated_at")
        .in("id", ids)
        .order("updated_at", { ascending: false }),

      supabase
        .from("conversation_members")
        .select("conversation_id,user_id,last_read_at")
        .in("conversation_id", ids),

      supabase
        .from("messages")
        .select("id,conversation_id,sender_id,body,created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false }),
    ])

  const otherIds = Array.from(
    new Set(
      (members ?? [])
        .filter((row) => row.user_id !== user.id)
        .map((row) => row.user_id),
    ),
  )

  const admin = createAdminClient()
  const {
    data: { users },
  } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  const people = new Map(
    users
      .filter((candidate) => otherIds.includes(candidate.id))
      .map((candidate) => [
        candidate.id,
        {
          id: candidate.id,
          displayName: displayName(candidate),
        },
      ]),
  )

  const myRead = new Map(
    (memberships ?? []).map((row) => [
      row.conversation_id,
      row.last_read_at,
    ]),
  )

  const items = (conversations ?? []).map((conversation) => {
    const participant = (members ?? []).find(
      (row) =>
        row.conversation_id === conversation.id &&
        row.user_id !== user.id,
    )

    const latest = (messages ?? []).find(
      (message) => message.conversation_id === conversation.id,
    )

    const readAt = myRead.get(conversation.id)
    const unread = latest
      ? latest.sender_id !== user.id &&
        (!readAt ||
          new Date(latest.created_at).getTime() >
            new Date(readAt).getTime())
      : false

    return {
      ...conversation,
      participant: participant
        ? people.get(participant.user_id) ?? {
            id: participant.user_id,
            displayName: "Collector",
          }
        : null,
      latestMessage: latest ?? null,
      unread,
    }
  })

  return NextResponse.json({ conversations: items })
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
  const otherUserId =
    typeof body?.userId === "string" ? body.userId : ""

  if (!otherUserId) {
    return NextResponse.json(
      { error: "Choose a user" },
      { status: 400 },
    )
  }

  const { data, error } = await supabase.rpc(
    "start_direct_conversation",
    {
      other_user_id: otherUserId,
    },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ conversationId: data }, { status: 201 })
}