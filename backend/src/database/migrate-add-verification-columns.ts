/**
 * Migration: Add verification columns and extend ENUMs for spp_items table
 * 
 * This migration adds the missing columns needed for the SITE verification workflow:
 * - rejection_reason: Stores why an item was rejected
 * - verified_by: User ID who verified/rejected
 * - verified_at: Timestamp of verification
 * 
 * Also extends ENUM values to support new statuses.
 */

import { pool } from '../config/database';

async function migrate() {
  try {
    console.log('Starting migration: Add verification columns to spp_items...');

    // 1. Check and add rejection_reason column
    const [rejectionColumns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'rejection_reason'`
    );

    if (Array.isArray(rejectionColumns) && (rejectionColumns as any[]).length === 0) {
      await pool.query(`
        ALTER TABLE spp_items 
        ADD COLUMN rejection_reason TEXT AFTER delivery_status
      `);
      console.log('✓ Added rejection_reason column');
    } else {
      console.log('✓ rejection_reason column already exists');
    }

    // 2. Check and add verified_by column
    const [verifiedByColumns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'verified_by'`
    );

    if (Array.isArray(verifiedByColumns) && (verifiedByColumns as any[]).length === 0) {
      await pool.query(`
        ALTER TABLE spp_items 
        ADD COLUMN verified_by INT AFTER rejection_reason,
        ADD CONSTRAINT fk_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ Added verified_by column with foreign key');
    } else {
      console.log('✓ verified_by column already exists');
    }

    // 3. Check and add verified_at column
    const [verifiedAtColumns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'verified_at'`
    );

    if (Array.isArray(verifiedAtColumns) && (verifiedAtColumns as any[]).length === 0) {
      await pool.query(`
        ALTER TABLE spp_items 
        ADD COLUMN verified_at TIMESTAMP NULL AFTER verified_by
      `);
      console.log('✓ Added verified_at column');
    } else {
      console.log('✓ verified_at column already exists');
    }

    // 4. Extend delivery_status ENUM
    // Check current ENUM values
    const [deliveryStatusResult] = await pool.query(
      `SELECT COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'delivery_status'`
    );

    const deliveryStatusType = (deliveryStatusResult as any[])[0]?.COLUMN_TYPE || '';
    if (!deliveryStatusType.includes('VERIFIED') || !deliveryStatusType.includes('REJECTED')) {
      await pool.query(`
        ALTER TABLE spp_items 
        MODIFY COLUMN delivery_status ENUM('NOT_SENT', 'SENT', 'VERIFIED', 'REJECTED') DEFAULT 'NOT_SENT'
      `);
      console.log('✓ Extended delivery_status ENUM to include VERIFIED and REJECTED');
    } else {
      console.log('✓ delivery_status ENUM already extended');
    }

    // 5. Extend item_status ENUM
    const [itemStatusResult] = await pool.query(
      `SELECT COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'spp_items' 
       AND COLUMN_NAME = 'item_status'`
    );

    const itemStatusType = (itemStatusResult as any[])[0]?.COLUMN_TYPE || '';
    if (!itemStatusType.includes('PENDING_VERIFICATION')) {
      await pool.query(`
        ALTER TABLE spp_items 
        MODIFY COLUMN item_status ENUM('PENDING', 'IN_TRANSIT', 'PENDING_VERIFICATION', 'RECEIVED') DEFAULT 'PENDING'
      `);
      console.log('✓ Extended item_status ENUM to include PENDING_VERIFICATION');
    } else {
      console.log('✓ item_status ENUM already extended');
    }

    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
