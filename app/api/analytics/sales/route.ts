import { NextResponse } from "next/server"

import { supabaseTable } from "@/lib/supabase"

/**
 * Append-only ledger of realized sales. Recorded from inventory-context's
 * recordSale so the analytics page can report exact, time-stamped revenue,
 * cost of goods sold, and realized ROI/margin trends.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const cardId = typeof body?.cardId === "string" ? body.cardId : ""
  const quantity = Math.max(1, Math.floor(Number(body?.quantity) || 1))
  const unitPrice = Math.max(0, Number(body?.unitPrice) || 0)
  const purchasePrice = Math.max(0, Number(body?.purchasePrice) || 0)

  if (!cardId) {
    return NextResponse.json({ error: "Missing cardId" }, { status: 400 })
  }

  try {
    await supabaseTable("card_sales", {
      method: "POST",
      body: {
        inventory_id:
          typeof body?.inventoryId === "string" ? body.inventoryId : null,
        card_id: cardId,
        card_name: typeof body?.cardName === "string" ? body.cardName : null,
        set_name: typeof body?.setName === "string" ? body.setName : null,
        rarity: typeof body?.rarity === "string" ? body.rarity : null,
        finish: typeof body?.finish === "string" ? body.finish : null,
        condition: typeof body?.condition === "string" ? body.condition : null,
        quantity,
        unit_price: Number(unitPrice.toFixed(2)),
        purchase_price: Number(purchasePrice.toFixed(2)),
      },
    })
  } catch (error) {
    console.error("Sale record failed", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sale record failed",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
