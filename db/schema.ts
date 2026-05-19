import { boolean, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull(),
  card: jsonb("card").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").notNull().unique(),
  condition: text("condition").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  quantitySold: integer("quantity_sold").notNull().default(0),
  printFinish: text("print_finish"),
  notes: text("notes"),
  customImage: text("custom_image"),
  isManualEntry: boolean("is_manual_entry").notNull().default(false),
  squareItemId: text("square_item_id"),
  squareVariationId: text("square_variation_id"),
  syncedToSquare: boolean("synced_to_square").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const binderItems = pgTable(
  "binder_items",
  {
    tier: text("tier").notNull(),
    itemId: text("item_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.tier, table.itemId] })],
)
