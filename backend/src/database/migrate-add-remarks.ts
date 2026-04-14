/**
 * Migration: Add remarks column to spp_items table
 * 
 * This migration adds a remarks column so users can specify the purpose/need
 * for each item, separate from the technical description.
 */

import { pool } from '../config/database';

async function migrate() {
  try {
    console.log('Starting migration: Add remarks to spp_items...');

    // Check if column already exists
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'remarks'`
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log('Column remarks already exists. Skipping migration.');
      process.exit(0);
    }

    // Add remarks column after description
    await pool.query(`
      ALTER TABLE spp_items 
      ADD COLUMN remarks TEXT AFTER description
    `);

    console.log('✓ Added remarks column to spp_items');
    console.log('✓ Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
