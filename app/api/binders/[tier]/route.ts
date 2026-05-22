import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { binderItems, inventory } from "@/db/schema"
import type { CardCondition, CardPrintFinish, InventoryItem, PriceTier } from "@/lib/types"

const TIERS: PriceTier[] = ["budget", "mid", "premium"]

function serialize(row: typeof inventory.$inferSelect): InventoryItem {
  return {
    ...row,
    card: row.card as InventoryItem["card"],
    condition: row.condition as CardCondition,
    printFinish: row.printFinish as CardPrintFinish | undefined,
    price: Number(row.price),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes ?? undefined,
    customImage: row.customImage ?? undefined,
    squareItemId: row.squareItemId ?? undefined,
    squareVariationId: row.squareVariationId ?? undefined,
  }
}

function validTier(tier: string): tier is PriceTier {
  return TIERS.includes(tier as PriceTier)
}

export async function GET(_request: Request, { params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params
  if (!validTier(tier)) return new Response("Invalid binder tier", { status: 400 })

  const rows = await db
    .select({ item: inventory })
    .from(binderItems)
    .innerJoin(inventory, eq(binderItems.itemId, inventory.id))
    .where(eq(binderItems.tier, tier))
    .orderBy(desc(binderItems.createdAt))

  return Response.json(rows.map((row) => serialize(row.item)))
}

export async function POST(request: Request, { params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params
  if (!validTier(tier)) return new Response("Invalid binder tier", { status: 400 })

  const { itemId } = (await request.json()) as { itemId?: string }
  if (!itemId) return new Response("Missing itemId", { status: 400 })

  await db.insert(binderItems).values({ tier, itemId }).onConflictDoNothing()
  return Response.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params
  if (!validTier(tier)) return new Response("Invalid binder tier", { status: 400 })

  const { itemId } = (await request.json()) as { itemId?: string }
  if (!itemId) return new Response("Missing itemId", { status: 400 })

  await db.delete(binderItems).where(and(eq(binderItems.tier, tier), eq(binderItems.itemId, itemId)))
  return Response.json({ ok: true })
}
