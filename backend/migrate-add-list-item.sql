-- Simple migration to add list_item column to spp_items table
-- Safe to run multiple times (will skip if column exists)

-- Add list_item column if it doesn't exist
ALTER TABLE spp_items 
ADD COLUMN IF NOT EXISTS list_item VARCHAR(255) NOT NULL DEFAULT '' 
AFTER list_item_number;

-- Verify column was added
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'spp_items'
  AND COLUMN_NAME = 'list_item';
