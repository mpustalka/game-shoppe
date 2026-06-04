BEGIN;

CREATE TABLE IF NOT EXISTS card_search_events (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS card_search_events_normalized_query_idx
  ON card_search_events (normalized_query);

CREATE INDEX IF NOT EXISTS card_search_events_created_at_idx
  ON card_search_events (created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  item JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_items_card_id_idx
  ON inventory_items (card_id);

CREATE INDEX IF NOT EXISTS inventory_items_created_at_idx
  ON inventory_items (created_at DESC);

CREATE TABLE IF NOT EXISTS binder_entries (
  tier TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item JSONB NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tier, item_id)
);

CREATE INDEX IF NOT EXISTS binder_entries_tier_added_at_idx
  ON binder_entries (tier, added_at DESC);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS finish TEXT NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS quantity_sold INTEGER NOT NULL DEFAULT 0;

UPDATE inventory_items
SET condition = COALESCE(condition, item->>'condition'),
    finish = COALESCE(NULLIF(item->>'finish', ''), finish, 'Normal'),
    price = COALESCE(price, NULLIF(item->>'price', '')::numeric),
    quantity = COALESCE(quantity, NULLIF(item->>'quantity', '')::integer),
    quantity_sold = COALESCE(quantity_sold, NULLIF(item->>'quantitySold', '')::integer, 0),
    item = CASE
      WHEN item ? 'finish' THEN item
      ELSE jsonb_set(item, '{finish}', '"Normal"', true)
    END;

CREATE INDEX IF NOT EXISTS inventory_items_finish_idx
  ON inventory_items (finish);

CREATE INDEX IF NOT EXISTS inventory_items_condition_finish_idx
  ON inventory_items (condition, finish);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS variant TEXT,
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_value NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMIT;
