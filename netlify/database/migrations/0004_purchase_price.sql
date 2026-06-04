ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2);