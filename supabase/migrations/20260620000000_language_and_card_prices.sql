-- Brings the Supabase schema in line with what the API routes already expect.
--
-- The inventory and binder routes read/write a `language` column and the binder
-- upsert targets the (tier, language, item_id) constraint. The pricing route
-- reads a `card_prices` cache table. None of these existed yet, which caused
-- inserts/upserts to fail. This migration adds them. Safe to run repeatedly.

BEGIN;

-- 1. Language support on inventory + binders (English / Japanese cards).
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

ALTER TABLE binder_entries
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS inventory_items_language_idx
  ON inventory_items (language);

CREATE INDEX IF NOT EXISTS binder_entries_language_idx
  ON binder_entries (language);

-- 2. PostgREST upsert target for binder entries.
--    `onConflict: "tier,language,item_id"` requires a matching unique constraint.
ALTER TABLE binder_entries
  DROP CONSTRAINT IF EXISTS binder_entries_tier_language_item_id_key;

ALTER TABLE binder_entries
  ADD CONSTRAINT binder_entries_tier_language_item_id_key
  UNIQUE (tier, language, item_id);

-- 3. Cached market / TCGplayer prices per card, condition and finish.
CREATE TABLE IF NOT EXISTS card_prices (
  card_id TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Near Mint',
  finish TEXT NOT NULL DEFAULT 'Normal',
  market_price NUMERIC(12, 2),
  source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (card_id, condition, finish)
);

CREATE INDEX IF NOT EXISTS card_prices_card_id_idx
  ON card_prices (card_id);

COMMIT;
