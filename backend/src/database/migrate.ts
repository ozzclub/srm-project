import { pool } from '../config/database';

const migrate = async () => {
  console.log('🚀 Starting database migration...');

  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'staff') DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created table: users');

    // Create material_types table (NEW)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created table: material_types');

    // Create materials table with new structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_code VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(255) NOT NULL,
        remarks TEXT,
        unit VARCHAR(20) NOT NULL,
        unit_price DECIMAL(15, 2) DEFAULT 0.00,
        whse VARCHAR(50),
        material_type_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_type_id) REFERENCES material_types(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created table: materials');

    // Create locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        location_name VARCHAR(100) NOT NULL,
        location_type ENUM('warehouse', 'workshop', 'site') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created table: locations');

    // Create movement_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movement_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL
      )
    `);
    console.log('✅ Created table: movement_types');

    // Create movement_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movement_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(50) NOT NULL,
        transaction_date DATE NOT NULL,
        trip_id VARCHAR(50),
        document_no VARCHAR(50),
        material_id INT,
        qty DECIMAL(10, 2),
        from_location_id INT,
        to_location_id INT,
        movement_type_id INT,
        vehicle_driver VARCHAR(100),
        received_by VARCHAR(100),
        loading_time DATETIME,
        unloading_time DATETIME,
        condition_notes TEXT,
        documentation_link TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
        FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL,
        FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL,
        FOREIGN KEY (movement_type_id) REFERENCES movement_types(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created table: movement_log');

    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        category VARCHAR(50),
        file_name VARCHAR(255),
        file_size BIGINT,
        mime_type VARCHAR(100),
        uploaded_by INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created table: documents');

    // Create mto_requests table (Material Take Off)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mto_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mto_number VARCHAR(50) UNIQUE NOT NULL,
        project_name VARCHAR(200),
        work_order_no VARCHAR(100),
        request_date DATE NOT NULL,
        required_date DATE,
        requested_by VARCHAR(100) NOT NULL,
        approved_by VARCHAR(100),
        status ENUM('DRAFT', 'APPROVED', 'PARTIAL', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created table: mto_requests');

    // Create mto_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mto_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mto_id INT NOT NULL,
        material_id INT NOT NULL,
        requested_qty DECIMAL(10, 2) NOT NULL,
        fulfilled_qty DECIMAL(10, 2) DEFAULT 0,
        unit VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mto_id) REFERENCES mto_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created table: mto_items');

    // Add mto_item_id column to movement_log if it doesn't exist
    await pool.query(`
      ALTER TABLE movement_log 
      ADD COLUMN IF NOT EXISTS mto_item_id INT NULL,
      ADD FOREIGN KEY (mto_item_id) REFERENCES mto_items(id) ON DELETE SET NULL
    `);
    console.log('✅ Added mto_item_id column to movement_log');

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transaction_id ON movement_log(transaction_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transaction_date ON movement_log(transaction_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_material_id ON movement_log(material_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_document_transaction_id ON documents(transaction_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mto_status ON mto_requests(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mto_request_date ON mto_requests(request_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mto_items_mto_id ON mto_items(mto_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mto_items_material_id ON mto_items(material_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_movement_log_mto_item_id ON movement_log(mto_item_id)`);
    console.log('✅ Created indexes');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit();
  }
};

migrate();
