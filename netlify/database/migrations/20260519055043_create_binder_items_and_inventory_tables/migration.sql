CREATE TABLE "binder_items" (
	"tier" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" text PRIMARY KEY,
	"card_id" text NOT NULL,
	"card" jsonb NOT NULL,
	"sku" text NOT NULL UNIQUE,
	"barcode" text NOT NULL UNIQUE,
	"condition" text NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"quantity" integer NOT NULL,
	"quantity_sold" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"custom_image" text,
	"is_manual_entry" boolean DEFAULT false NOT NULL,
	"square_item_id" text,
	"square_variation_id" text,
	"synced_to_square" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "binder_items" ADD CONSTRAINT "binder_items_item_id_inventory_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory"("id") ON DELETE CASCADE;