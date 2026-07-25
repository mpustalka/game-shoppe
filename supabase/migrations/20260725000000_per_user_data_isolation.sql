-- Per-user data isolation.
--
-- Until now every user-owned table (inventory, binders, customer lists,
-- showcases, the sales ledger) was global: one shared set of rows that every
-- signed-in account read and wrote. A brand-new signup therefore opened the app
-- and saw the owner's inventory already filled in — and could edit or delete it.
--
-- This adds an owning `user_id` to each of those tables, indexes it for the
-- per-user reads the API now does, and backfills every pre-existing row to the
-- owner account so no existing data is orphaned.
--
-- Market/reference data (card_prices, card_price_snapshots) is deliberately NOT
-- scoped — pricing is the same for everyone and is shared on purpose.

-- 1. Ownership columns. Nullable so the backfill below can run, and so any row
--    written by an older deploy mid-rollout is still accepted.
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE binder_entries
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE customer_lists
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE showcase_binders
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE card_sales
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Search telemetry drives each account's own "top searches" and "unmet demand"
-- panels, so it is owned data too.
ALTER TABLE card_search_events
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Marks rows that predate ownership tracking and were attributed by the backfill
-- below rather than by the account that actually created them. The old shared
-- tables recorded no author, so for any row added while more than one account
-- existed, "who owns this" is a best guess. Keeping the guess labelled means it
-- can be revisited later; without this flag, backfilled rows would be
-- indistinguishable from rows the owner genuinely created.
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS ownership_backfilled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE binder_entries
  ADD COLUMN IF NOT EXISTS ownership_backfilled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Backfill legacy rows to the owner: the admin account if it exists, else the
--    oldest account (which, on a single-tenant install, is the same person).
--    Without this, pre-existing inventory would belong to nobody and vanish
--    from the UI the moment reads became user-scoped.
DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT id INTO owner_id
  FROM auth.users
  WHERE lower(email) = 'admin@evileevee.com'
  LIMIT 1;

  IF owner_id IS NULL THEN
    SELECT id INTO owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF owner_id IS NOT NULL THEN
    UPDATE inventory_items
      SET user_id = owner_id, ownership_backfilled = TRUE
      WHERE user_id IS NULL;
    UPDATE binder_entries
      SET user_id = owner_id, ownership_backfilled = TRUE
      WHERE user_id IS NULL;
    UPDATE customer_lists   SET user_id = owner_id WHERE user_id IS NULL;
    UPDATE showcase_binders SET user_id = owner_id WHERE user_id IS NULL;
    UPDATE card_sales       SET user_id = owner_id WHERE user_id IS NULL;
    UPDATE card_search_events SET user_id = owner_id WHERE user_id IS NULL;
  END IF;
END $$;

-- 3. Indexes for the user-scoped reads every data route now performs.
CREATE INDEX IF NOT EXISTS inventory_items_user_id_idx
  ON inventory_items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS binder_entries_user_id_idx
  ON binder_entries (user_id, tier, language, added_at DESC);

CREATE INDEX IF NOT EXISTS customer_lists_user_id_idx
  ON customer_lists (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS showcase_binders_user_id_idx
  ON showcase_binders (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS card_sales_user_id_idx
  ON card_sales (user_id, sold_at DESC);

CREATE INDEX IF NOT EXISTS card_search_events_user_id_idx
  ON card_search_events (user_id, created_at DESC);

-- 4. Binder upserts key on (tier, language, item_id), which would let one user's
--    binder entry collide with another's for the same card. Widen the uniqueness
--    to include the owner so each account gets its own binders.
ALTER TABLE binder_entries
  DROP CONSTRAINT IF EXISTS binder_entries_tier_language_item_id_key;

-- The original composite primary key has the same cross-user collision problem.
-- It can't simply be widened: user_id is nullable (see step 1) and primary-key
-- columns must be NOT NULL, so uniqueness is enforced by the index below.
ALTER TABLE binder_entries
  DROP CONSTRAINT IF EXISTS binder_entries_pkey;

-- A unique index (rather than a named constraint) so re-running this migration
-- is safe. PostgREST's on_conflict upsert target works with either.
CREATE UNIQUE INDEX IF NOT EXISTS binder_entries_user_tier_language_item_idx
  ON binder_entries (user_id, tier, language, item_id);
