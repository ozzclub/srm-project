-- Migration: Add list_item column to spp_items table
-- Run this if spp_items table already exists and needs the list_item column

-- Check if column exists before adding
-- This ensures idempotency (safe to run multiple times)

-- Add list_item column if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'spp_items';
SET @columnname = 'list_item';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NOT NULL DEFAULT \'\' AFTER list_item_number')
));

PREPARE addColumnIfNotExists FROM @preparedStatement;
EXECUTE addColumnIfNotExists;
DEALLOCATE PREPARE addColumnIfNotExists;

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
