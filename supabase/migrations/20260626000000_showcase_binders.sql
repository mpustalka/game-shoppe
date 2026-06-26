-- Shareable public "Showcase" binders.
--
-- A Showcase is a standalone, publicly shareable binder that is NOT tied to a
-- price tier. An employee builds it by adding any cards (any value) and shares
-- a public read-only URL keyed by `share_token`. Cards are stored as JSONB so
-- the full card snapshot (name, set, price, condition, finish, images) travels
-- with the binder.
--
-- A soft limit of 50 cards is enforced in the application layer. (A future paid
-- upgrade is planned for binders that exceed 50 cards — not implemented here.)

BEGIN;

CREATE TABLE IF NOT EXISTS showcase_binders (
  id TEXT PRIMARY KEY,
  share_token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Showcase',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS showcase_binders_share_token_idx
  ON showcase_binders (share_token);

CREATE INDEX IF NOT EXISTS showcase_binders_updated_at_idx
  ON showcase_binders (updated_at DESC);

COMMIT;
