/**
 * Migration: Add item_type column to spp_items table
 * 
 * This migration adds an explicit item_type column so users can classify
 * items as TOOL or MATERIAL (consumable) when creating SPP requests.
 */

import { pool } from '../config/database';

async function migrate() {
  try {
    console.log('Starting migration: Add item_type to spp_items...');

    // Check if column already exists
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'item_type'`
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log('Column item_type already exists. Skipping migration.');
      process.exit(0);
    }

    // Add item_type column with default 'MATERIAL'
    await pool.query(`
      ALTER TABLE spp_items 
      ADD COLUMN item_type ENUM('TOOL', 'MATERIAL') DEFAULT 'MATERIAL' 
      AFTER description
    `);

    console.log('✓ Added item_type column to spp_items');

    // Data migration: Try to auto-classify existing items based on material_type
    await pool.query(`
      UPDATE spp_items si
      INNER JOIN materials m ON si.material_id = m.id
      INNER JOIN material_types mt ON m.material_type_id = mt.id
      SET si.item_type = CASE 
        WHEN LOWER(mt.type_name) LIKE '%tool%' THEN 'TOOL'
        WHEN LOWER(mt.type_name) LIKE '%equipment%' THEN 'TOOL'
        WHEN LOWER(mt.type_name) LIKE '%durable%' THEN 'TOOL'
        ELSE 'MATERIAL'
      END
      WHERE si.material_id IS NOT NULL
        AND si.item_type = 'MATERIAL'
    `);

    console.log('✓ Auto-classified existing items based on material_type (if available)');
    console.log('✓ Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
