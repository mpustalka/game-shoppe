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
