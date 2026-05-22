import { eq } from "drizzle-orm"
import { db } from "@/db"
import { inventory } from "@/db/schema"
import type { CardCondition, CardPrintFinish, InventoryItem } from "@/lib/types"

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = (await request.json()) as Partial<InventoryItem>
  const { createdAt, updatedAt, price, ...rest } = data
  const updateData = {
    ...rest,
    price: price === undefined ? undefined : price.toFixed(2),
    updatedAt: new Date(),
  }

  const [updated] = await db.update(inventory).set(updateData).where(eq(inventory.id, id)).returning()
  if (!updated) return new Response("Not found", { status: 404 })
  return Response.json(serialize(updated))
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.delete(inventory).where(eq(inventory.id, id))
  return Response.json({ ok: true })
}
