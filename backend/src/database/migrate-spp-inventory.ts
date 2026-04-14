import { pool } from '../config/database';
import { MigrationService } from './migration';

export async function migrateSPPAndInventory() {
  console.log('\n🔧 Running SPP & Inventory migrations...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let tablesCreated = 0;

  // 1. Update users table to support new roles
  try {
    const columns = await MigrationService.getColumns('users');
    const roleColumn = columns.find(col => col.Field === 'role');

    if (roleColumn) {
      // Check if role enum already includes new roles
      if (!roleColumn.Type.includes('workshop') || !roleColumn.Type.includes('material_site') || !roleColumn.Type.includes('site')) {
        console.log('  🔄 Updating users table role enum...');
        await pool.query(`
          ALTER TABLE users
          MODIFY COLUMN role ENUM('admin', 'staff', 'site', 'workshop', 'material_site') DEFAULT 'staff'
        `);
        console.log('  ✅ Updated users role enum');
      } else {
        console.log('  ✅ users role enum already up to date');
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  users role update skipped: ${error.message}`);
  }

  // 2. SPP Requests table
  try {
    if (!await MigrationService.tableExists('spp_requests')) {
      await MigrationService.createTable('spp_requests', `
        CREATE TABLE spp_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          spp_number VARCHAR(20) UNIQUE NOT NULL,
          request_date DATE NOT NULL,
          requested_by VARCHAR(100) NOT NULL,
          created_by_role ENUM('site', 'workshop') DEFAULT 'site',
          status ENUM('DRAFT', 'PENDING', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      tablesCreated++;
    } else {
      console.log('  ✅ spp_requests table exists');
      // Add created_by_role column if it doesn't exist
      const columns = await MigrationService.getColumns('spp_requests');
      if (!columns.find(col => col.Field === 'created_by_role')) {
        await pool.query(`
          ALTER TABLE spp_requests
          ADD COLUMN created_by_role ENUM('site', 'workshop') DEFAULT 'site' AFTER requested_by
        `);
        console.log('  ✅ Added created_by_role column to spp_requests');
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  spp_requests table check skipped: ${error.message}`);
  }

  // 3. SPP Items table
  try {
    if (!await MigrationService.tableExists('spp_items')) {
      await MigrationService.createTable('spp_items', `
        CREATE TABLE spp_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          spp_id INT NOT NULL,
          material_id INT,
          list_item_number INT NOT NULL,
          list_item VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          remarks TEXT,
          unit VARCHAR(20) NOT NULL,
          request_qty DECIMAL(10, 2) NOT NULL,
          receive_qty DECIMAL(10, 2) DEFAULT 0.00,
          remaining_qty DECIMAL(10, 2) GENERATED ALWAYS AS (request_qty - receive_qty) STORED,
          request_status ENUM('PENDING', 'PARTIAL', 'FULFILLED') DEFAULT 'PENDING',
          date_req DATE NOT NULL,
          item_type ENUM('TOOL', 'MATERIAL') DEFAULT 'MATERIAL',
          item_status ENUM('PENDING', 'APPROVED', 'IN_TRANSIT', 'PENDING_VERIFICATION', 'RECEIVED') DEFAULT 'PENDING',
          delivery_status ENUM('NOT_SENT', 'PARTIAL', 'SENT', 'VERIFIED', 'REJECTED') DEFAULT 'NOT_SENT',
          verified_by INT,
          verified_at TIMESTAMP NULL,
          rejection_reason TEXT,
          return_qty DECIMAL(10, 2) DEFAULT 0.00,
          returned_qty DECIMAL(10, 2) DEFAULT 0.00,
          return_type ENUM('NONE', 'REPLACEMENT', 'SURPLUS') DEFAULT 'NONE',
          return_status ENUM('NONE', 'RETURNING', 'RETURNED') DEFAULT 'NONE',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (spp_id) REFERENCES spp_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
          FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      tablesCreated++;
    } else {
      console.log('  ✅ spp_items table exists');
      
      // Get current columns to check what's missing
      const columns = await MigrationService.getColumns('spp_items');
      
      // 1. Add remarks column if missing
      if (!columns.find(col => col.Field === 'remarks')) {
        await pool.query(`
          ALTER TABLE spp_items
          ADD COLUMN remarks TEXT AFTER description
        `);
        console.log('  ✅ Added remarks column to spp_items');
      }

      // 2. Add item_type column if missing
      if (!columns.find(col => col.Field === 'item_type')) {
        await pool.query(`
          ALTER TABLE spp_items
          ADD COLUMN item_type ENUM('TOOL', 'MATERIAL') DEFAULT 'MATERIAL' AFTER date_req
        `);
        console.log('  ✅ Added item_type column to spp_items');
      }

      // 3. Update item_status ENUM if needed
      const itemStatusCol = columns.find(col => col.Field === 'item_status');
      if (itemStatusCol && !itemStatusCol.Type.includes('PENDING_VERIFICATION')) {
        await pool.query(`
          ALTER TABLE spp_items
          MODIFY COLUMN item_status ENUM('PENDING', 'APPROVED', 'IN_TRANSIT', 'PENDING_VERIFICATION', 'RECEIVED') DEFAULT 'PENDING'
        `);
        console.log('  ✅ Updated item_status ENUM in spp_items');
      }

      // 4. Update delivery_status ENUM if needed (also adds the column if missing)
      const deliveryStatusCol = columns.find(col => col.Field === 'delivery_status');
      if (!deliveryStatusCol) {
        await pool.query(`
          ALTER TABLE spp_items
          ADD COLUMN delivery_status ENUM('NOT_SENT', 'PARTIAL', 'SENT', 'VERIFIED', 'REJECTED') DEFAULT 'NOT_SENT' AFTER item_status
        `);
        console.log('  ✅ Added delivery_status column to spp_items');
      } else if (!deliveryStatusCol.Type.includes('VERIFIED')) {
        await pool.query(`
          ALTER TABLE spp_items
          MODIFY COLUMN delivery_status ENUM('NOT_SENT', 'PARTIAL', 'SENT', 'VERIFIED', 'REJECTED') DEFAULT 'NOT_SENT'
        `);
        console.log('  ✅ Updated delivery_status ENUM in spp_items');
      }

      // 5. Add verification columns if missing
      if (!columns.find(col => col.Field === 'verified_by')) {
        await pool.query(`
          ALTER TABLE spp_items
          ADD COLUMN verified_by INT AFTER delivery_status,
          ADD COLUMN verified_at TIMESTAMP NULL AFTER verified_by,
          ADD COLUMN rejection_reason TEXT AFTER verified_at,
          ADD FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('  ✅ Added verification columns to spp_items');
      }

      // 6. Add return columns if they don't exist
      if (!columns.find(col => col.Field === 'return_qty')) {
        await pool.query(`
          ALTER TABLE spp_items
          ADD COLUMN return_qty DECIMAL(10, 2) DEFAULT 0.00 AFTER rejection_reason,
          ADD COLUMN returned_qty DECIMAL(10, 2) DEFAULT 0.00 AFTER return_qty,
          ADD COLUMN return_type ENUM('NONE', 'REPLACEMENT', 'SURPLUS') DEFAULT 'NONE' AFTER returned_qty,
          ADD COLUMN return_status ENUM('NONE', 'RETURNING', 'RETURNED') DEFAULT 'NONE' AFTER return_type
        `);
        console.log('  ✅ Added return columns to spp_items');
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  spp_items table check skipped: ${error.message}`);
  }

  // 4. SPP Approvals table
  try {
    if (!await MigrationService.tableExists('spp_approvals')) {
      await MigrationService.createTable('spp_approvals', `
        CREATE TABLE spp_approvals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          spp_id INT NOT NULL,
          approved_by INT,
          approval_role ENUM('site', 'workshop', 'material_site') NOT NULL,
          approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
          approval_notes TEXT,
          approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_spp_role_status (spp_id, approval_role, approval_status),
          FOREIGN KEY (spp_id) REFERENCES spp_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      tablesCreated++;
    } else {
      console.log('  ✅ spp_approvals table exists');
      // Update approval_role enum to include 'site'
      const columns = await MigrationService.getColumns('spp_approvals');
      const roleColumn = columns.find(col => col.Field === 'approval_role');
      if (roleColumn && !roleColumn.Type.includes('site')) {
        await pool.query(`
          ALTER TABLE spp_approvals
          MODIFY COLUMN approval_role ENUM('site', 'workshop', 'material_site') NOT NULL
        `);
        console.log('  ✅ Updated approval_role enum to include site');
      }
    }
  } catch (error: any) {
    console.log(`  ⚠️  spp_approvals table check skipped: ${error.message}`);
  }

  // 5. Inventory table
  try {
    if (!await MigrationService.tableExists('inventory')) {
      await MigrationService.createTable('inventory', `
        CREATE TABLE inventory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          spp_item_id INT NOT NULL,
          material_id INT,
          item_type ENUM('TOOL', 'MATERIAL') NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          condition_status ENUM('GOOD', 'DAMAGED', 'CONSUMED') DEFAULT 'GOOD',
          location_id INT,
          received_from_spp VARCHAR(20) NOT NULL,
          received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (spp_item_id) REFERENCES spp_items(id) ON DELETE CASCADE,
          FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
          FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
        )
      `);
      tablesCreated++;
    } else {
      console.log('  ✅ inventory table exists');
    }
  } catch (error: any) {
    console.log(`  ⚠️  inventory table check skipped: ${error.message}`);
  }

  // Create indexes for better performance
  console.log('\n📊 Checking SPP & Inventory indexes...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let indexesCreated = 0;

  try {
    if (await MigrationService.tableExists('spp_requests')) {
      if (await MigrationService.ensureIndex('spp_requests', 'idx_spp_number', ['spp_number'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_requests', 'idx_spp_status', ['status'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_requests', 'idx_spp_request_date', ['request_date'])) indexesCreated++;
    }
  } catch (error: any) {
    console.log(`  ⚠️  spp_requests indexes check skipped: ${error.message}`);
  }

  try {
    if (await MigrationService.tableExists('spp_items')) {
      if (await MigrationService.ensureIndex('spp_items', 'idx_spp_items_spp_id', ['spp_id'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_items', 'idx_spp_items_material_id', ['material_id'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_items', 'idx_spp_items_request_status', ['request_status'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_items', 'idx_spp_items_item_status', ['item_status'])) indexesCreated++;
    }
  } catch (error: any) {
    console.log(`  ⚠️  spp_items indexes check skipped: ${error.message}`);
  }

  try {
    if (await MigrationService.tableExists('spp_approvals')) {
      if (await MigrationService.ensureIndex('spp_approvals', 'idx_spp_approvals_spp_id', ['spp_id'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_approvals', 'idx_spp_approvals_role', ['approval_role'])) indexesCreated++;
      if (await MigrationService.ensureIndex('spp_approvals', 'idx_spp_approvals_role_status', ['approval_role', 'approval_status'])) indexesCreated++;
    }
  } catch (error: any) {
    console.log(`  ⚠️  spp_approvals indexes check skipped: ${error.message}`);
  }

  try {
    if (await MigrationService.tableExists('inventory')) {
      if (await MigrationService.ensureIndex('inventory', 'idx_inventory_item_type', ['item_type'])) indexesCreated++;
      if (await MigrationService.ensureIndex('inventory', 'idx_inventory_material_id', ['material_id'])) indexesCreated++;
      if (await MigrationService.ensureIndex('inventory', 'idx_inventory_location_id', ['location_id'])) indexesCreated++;
      if (await MigrationService.ensureIndex('inventory', 'idx_inventory_spp_item_id', ['spp_item_id'])) indexesCreated++;
    }
  } catch (error: any) {
    console.log(`  ⚠️  inventory indexes check skipped: ${error.message}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ SPP & Inventory migration completed!`);
  console.log(`   📋 Tables created/verified: ${tablesCreated}`);
  console.log(`   📊 Indexes created: ${indexesCreated}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
