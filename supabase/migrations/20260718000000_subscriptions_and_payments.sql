-- Billing: manual CashApp subscriptions + payment / invoice ledger.
--
-- The platform charges NEW accounts $7.99/month after a 14-day free trial.
-- Existing accounts (created before the paid program launched) keep full
-- access for free — that grandfathering is decided in application code from the
-- auth user's created_at, so it needs no table.
--
-- Payments are collected manually over CashApp ($Evileevee1), so there is no
-- automatic gateway webhook. Instead a user records that they've sent payment,
-- which creates a `pending` row here; the admin confirms it, which flips the
-- row to `confirmed` and extends the account's paid period. Each row doubles as
-- an invoice (invoice_number, amount, and the period it covers).

BEGIN;

CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  -- Monotonic, human-readable invoice number (e.g. INV-000012).
  invoice_number TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 7.99,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'cashapp',
  -- pending | confirmed | rejected
  status TEXT NOT NULL DEFAULT 'pending',
  -- CashApp $cashtag / reference the customer paid from, plus an optional note.
  cashtag TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  -- Billing period this payment covers.
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS subscription_payments_user_idx
  ON subscription_payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_payments_status_idx
  ON subscription_payments (status);

-- Sequence backing the invoice numbers so each new invoice is unique and
-- increasing regardless of which user created it.
CREATE SEQUENCE IF NOT EXISTS subscription_invoice_seq START 1;

COMMIT;
