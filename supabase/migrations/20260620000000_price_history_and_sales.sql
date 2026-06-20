-- Mirror of netlify/database/migrations/0005_price_history_and_sales.sql
-- Price-change tracking and realized-sales ledger for the analytics page.

BEGIN;

CREATE TABLE IF NOT EXISTS card_price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  card_id TEXT NOT NULL,
  card_name TEXT,
  set_name TEXT,
  finish TEXT NOT NULL DEFAULT 'Normal',
  market_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  captured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, finish, captured_on)
);

CREATE INDEX IF NOT EXISTS card_price_snapshots_card_idx
  ON card_price_snapshots (card_id, captured_on DESC);

CREATE INDEX IF NOT EXISTS card_price_snapshots_captured_on_idx
  ON card_price_snapshots (captured_on DESC);

CREATE TABLE IF NOT EXISTS card_sales (
  id BIGSERIAL PRIMARY KEY,
  inventory_id TEXT,
  card_id TEXT NOT NULL,
  card_name TEXT,
  set_name TEXT,
  rarity TEXT,
  finish TEXT,
  condition TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS card_sales_sold_at_idx
  ON card_sales (sold_at DESC);

CREATE INDEX IF NOT EXISTS card_sales_card_id_idx
  ON card_sales (card_id);

COMMIT;
