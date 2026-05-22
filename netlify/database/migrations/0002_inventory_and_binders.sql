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
