-- Saved customer card lists.
--
-- Lets an employee build a named list of cards for a customer, attach a note,
-- and save it to look up later. Items are stored as JSONB so the full card
-- snapshot (name, set, price, condition, finish) travels with the list.

BEGIN;

CREATE TABLE IF NOT EXISTS customer_lists (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_lists_updated_at_idx
  ON customer_lists (updated_at DESC);

COMMIT;
