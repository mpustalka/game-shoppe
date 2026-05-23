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
