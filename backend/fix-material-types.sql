-- Quick fix script for adding material_types table and material_type_id column
-- Run this if you have an existing database

-- Create material_types table
CREATE TABLE IF NOT EXISTS material_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add material_type_id column to materials table if it doesn't exist
-- Check if column exists first
SET @dbname = DATABASE();
SET @tablename = 'materials';
SET @columnname = 'material_type_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT AFTER whse')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key constraint (ignore if already exists)
ALTER TABLE materials 
ADD FOREIGN KEY (material_type_id) REFERENCES material_types(id) ON DELETE SET NULL;

-- Optional: Insert some default material types
INSERT IGNORE INTO material_types (type_name, description) VALUES
('Wood', 'Wood and wood products'),
('Cement', 'Cement and cement products'),
('Steel', 'Steel and metal reinforcement'),
('Aggregate', 'Sand, gravel, and aggregates'),
('Electrical', 'Electrical materials'),
('Plumbing', 'Plumbing and pipe materials');

SELECT 'Migration completed successfully!' AS status;
