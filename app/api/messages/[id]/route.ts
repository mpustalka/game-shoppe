import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const MAX_MESSAGE_LENGTH = 4000
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

type MessageKind = "text" | "listing" | "image" | "offer" | "trade"

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

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
    .select(
      "id,conversation_id,sender_id,body,created_at,edited_at,sell_listing_id,listing_snapshot,attachment_path,attachment_type,attachment_name,attachment_size,message_kind,offer_amount,offer_status,trade_snapshot",
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hydrated = await Promise.all(
    (messages ?? []).map(async (message) => {
      if (!message.attachment_path) {
        return { ...message, attachment_url: null }
      }

      const { data } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(message.attachment_path, 60 * 60)

      return {
        ...message,
        attachment_url: data?.signedUrl ?? null,
      }
    }),
  )

  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id)

  return NextResponse.json({
    conversationId: id,
    currentUserId: user.id,
    messages: hydrated,
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

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)

  const message = cleanString(body?.body)
  const sellListingId = cleanString(body?.sellListingId) || null
  const attachmentPath = cleanString(body?.attachmentPath) || null
  const attachmentType = cleanString(body?.attachmentType) || null
  const attachmentName = cleanString(body?.attachmentName) || null
  const attachmentSize =
    typeof body?.attachmentSize === "number" ? body.attachmentSize : null

  const requestedKind = cleanString(body?.messageKind) as MessageKind
  const messageKind: MessageKind = [
    "text",
    "listing",
    "image",
    "offer",
    "trade",
  ].includes(requestedKind)
    ? requestedKind
    : attachmentPath
      ? "image"
      : sellListingId
        ? "listing"
        : "text"

  if (!message && !sellListingId && !attachmentPath) {
    return NextResponse.json(
      { error: "Enter a message or attach an image" },
      { status: 400 },
    )
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 })
  }

  if (attachmentPath) {
    const prefix = `${user.id}/${id}/`

    if (!attachmentPath.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 })
    }

    if (!attachmentType || !ALLOWED_ATTACHMENT_TYPES.has(attachmentType)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 })
    }

    if (
      !attachmentSize ||
      attachmentSize <= 0 ||
      attachmentSize > MAX_ATTACHMENT_SIZE
    ) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller" },
        { status: 400 },
      )
    }
  }

  let listingSnapshot =
    body?.listingSnapshot &&
    typeof body.listingSnapshot === "object" &&
    !Array.isArray(body.listingSnapshot)
      ? body.listingSnapshot
      : null

  if (sellListingId) {
    const { data: listing } = await supabase
      .from("sell_listings")
      .select(
        "id,seller_id,inventory_item_id,asking_price,quantity,status,listing_type,shipping_method,envelope_eligible,trade_notes,payment_notes,shipping_notes",
      )
      .eq("id", sellListingId)
      .maybeSingle()

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    listingSnapshot = {
      ...(listingSnapshot ?? {}),
      listingId: listing.id,
      sellerId: listing.seller_id,
      askingPrice: listing.asking_price,
      quantity: listing.quantity,
      status: listing.status,
      listingType: listing.listing_type,
      shippingMethod: listing.shipping_method,
      tradeNotes: listing.trade_notes,
      paymentNotes: listing.payment_notes,
      shippingNotes: listing.shipping_notes,
    }
  }

  const insertRow = {
    conversation_id: id,
    sender_id: user.id,
    body: message,
    sell_listing_id: sellListingId,
    listing_snapshot: listingSnapshot,
    attachment_path: attachmentPath,
    attachment_type: attachmentType,
    attachment_name: attachmentName,
    attachment_size: attachmentSize,
    message_kind: messageKind,
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(insertRow)
    .select(
      "id,conversation_id,sender_id,body,created_at,edited_at,sell_listing_id,listing_snapshot,attachment_path,attachment_type,attachment_name,attachment_size,message_kind",
    )
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: data }, { status: 201 })
}