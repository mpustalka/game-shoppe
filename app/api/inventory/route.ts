import { desc } from "drizzle-orm"
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

function valuesFromItem(item: InventoryItem): typeof inventory.$inferInsert {
  return {
    ...item,
    price: item.price.toFixed(2),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }
}

export async function GET() {
  const rows = await db.select().from(inventory).orderBy(desc(inventory.createdAt))
  return Response.json(rows.map(serialize))
}

export async function POST(request: Request) {
  const item = (await request.json()) as InventoryItem
  const [created] = await db.insert(inventory).values(valuesFromItem(item)).returning()
  return Response.json(serialize(created), { status: 201 })
}
