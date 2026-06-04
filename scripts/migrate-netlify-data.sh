#!/usr/bin/env bash
set -euo pipefail

: "${OLD_DB_URL:?Set OLD_DB_URL to your Netlify Database connection string}"
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to your Supabase Postgres connection string}"

echo "Clearing existing Supabase inventory_items table..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "TRUNCATE TABLE inventory_items RESTART IDENTITY;"

echo "Copying inventory_items from Netlify DB to Supabase..."
psql "$OLD_DB_URL" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT
    id,
    card_id,
    item,
    created_at,
    updated_at,
    COALESCE(NULLIF(item->>'condition',''), '') AS condition,
    COALESCE(NULLIF(item->>'finish',''), 'Normal') AS finish,
    NULLIF(item->>'price','')::numeric AS price,
    NULLIF(item->>'quantity','')::integer AS quantity,
    COALESCE(NULLIF(item->>'quantitySold','')::integer, 0) AS quantity_sold,
    NULLIF(item->>'purchasePrice','')::numeric AS purchase_price,
    item->>'variant' AS variant,
    COALESCE(NULLIF(item->>'marketValue','')::numeric, NULLIF(item->>'price','')::numeric, 0) AS market_value
  FROM inventory_items
) TO STDOUT CSV HEADER" \
| psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "\copy inventory_items (id, card_id, item, created_at, updated_at, condition, finish, price, quantity, quantity_sold, purchase_price, variant, market_value) FROM STDIN CSV HEADER"

echo "Inventory migration finished."
