const { Client } = require("pg")

async function main() {
  const oldDbUrl = process.env.OLD_DB_URL
  const supabaseDbUrl = process.env.SUPABASE_DB_URL

  if (!oldDbUrl || !supabaseDbUrl) {
    console.error(
      "Set OLD_DB_URL and SUPABASE_DB_URL before running this script.",
    )
    process.exit(1)
  }

  const oldClient = new Client({
    connectionString: oldDbUrl,
    ssl: { rejectUnauthorized: false },
  })

  const supabaseClient = new Client({
    connectionString: supabaseDbUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log("Connecting to both databases...")
    await oldClient.connect()
    await supabaseClient.connect()

    console.log("Clearing existing Supabase inventory rows...")
    await supabaseClient.query(
      "TRUNCATE TABLE inventory_items RESTART IDENTITY;",
    )

    const result = await oldClient.query(`
      SELECT
        id,
        card_id,
        item,
        created_at,
        updated_at
      FROM inventory_items
      ORDER BY created_at ASC
    `)

    console.log(`Found ${result.rows.length} inventory rows to copy.`)

    for (const row of result.rows) {
      const item = row.item || {}

      await supabaseClient.query(
        `
          INSERT INTO inventory_items (
            id,
            card_id,
            item,
            condition,
            finish,
            price,
            quantity,
            quantity_sold,
            purchase_price,
            variant,
            market_value,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            card_id = EXCLUDED.card_id,
            item = EXCLUDED.item,
            condition = EXCLUDED.condition,
            finish = EXCLUDED.finish,
            price = EXCLUDED.price,
            quantity = EXCLUDED.quantity,
            quantity_sold = EXCLUDED.quantity_sold,
            purchase_price = EXCLUDED.purchase_price,
            variant = EXCLUDED.variant,
            market_value = EXCLUDED.market_value,
            updated_at = EXCLUDED.updated_at
        `,
        [
          row.id,
          row.card_id,
          item,
          String(item.condition || ""),
          String(item.finish || "Normal"),
          item.price !== undefined && item.price !== null && item.price !== ""
            ? Number(item.price)
            : null,
          item.quantity !== undefined &&
          item.quantity !== null &&
          item.quantity !== ""
            ? Number(item.quantity)
            : null,
          Number(item.quantitySold || 0),
          item.purchasePrice !== undefined &&
          item.purchasePrice !== null &&
          item.purchasePrice !== ""
            ? Number(item.purchasePrice)
            : null,
          item.variant || null,
          Number(item.marketValue || item.price || 0),
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString(),
        ],
      )
    }

    console.log("Inventory migration finished successfully.")
  } finally {
    await oldClient.end().catch(() => undefined)
    await supabaseClient.end().catch(() => undefined)
  }
}

main().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})
