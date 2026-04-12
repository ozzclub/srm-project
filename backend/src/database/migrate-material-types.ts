import { pool } from '../config/database';

const migrate = async () => {
  console.log('🔧 Running material_types migration...\n');

  try {
    // 1. Create material_types table
    console.log('📝 Creating material_types table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS material_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created material_types table\n');

    // 2. Check and add missing columns to materials table
    console.log('📝 Checking materials table for missing columns...');
    
    // Check for description column (migration from material_name)
    const [descColumns]: any = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'material_control' 
        AND TABLE_NAME = 'materials' 
        AND COLUMN_NAME IN ('description', 'remarks', 'unit_price', 'whse')
    `);
    
    const existingColumns = descColumns.map((col: any) => col.COLUMN_NAME);
    
    if (!existingColumns.includes('description')) {
      console.log('➕ Renaming material_name to description...');
      try {
        await pool.query(`
          ALTER TABLE materials 
          CHANGE COLUMN material_name description VARCHAR(255) NOT NULL
        `);
        console.log('✅ Renamed material_name to description\n');
      } catch (error: any) {
        console.log(`⚠️  ${error.message}\n`);
      }
    } else {
      console.log('✅ description column exists');
    }
    
    if (!existingColumns.includes('remarks')) {
      console.log('➕ Renaming specification to remarks...');
      try {
        await pool.query(`
          ALTER TABLE materials 
          CHANGE COLUMN specification remarks TEXT
        `);
        console.log('✅ Renamed specification to remarks\n');
      } catch (error: any) {
        console.log(`⚠️  ${error.message}\n`);
      }
    } else {
      console.log('✅ remarks column exists');
    }
    
    if (!existingColumns.includes('unit_price')) {
      console.log('➕ Adding unit_price column...');
      await pool.query(`
        ALTER TABLE materials 
        ADD COLUMN unit_price DECIMAL(15, 2) DEFAULT 0.00 AFTER unit
      `);
      console.log('✅ Added unit_price column\n');
    } else {
      console.log('✅ unit_price column exists');
    }
    
    if (!existingColumns.includes('whse')) {
      console.log('➕ Adding whse column...');
      await pool.query(`
        ALTER TABLE materials 
        ADD COLUMN whse VARCHAR(50) AFTER unit_price
      `);
      console.log('✅ Added whse column\n');
    } else {
      console.log('✅ whse column exists');
    }

    // Check for material_type_id
    const [typeIdColumns]: any = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'material_control' 
        AND TABLE_NAME = 'materials' 
        AND COLUMN_NAME = 'material_type_id'
    `);

    if (typeIdColumns.length === 0) {
      console.log('➕ Adding material_type_id column...');
      await pool.query(`
        ALTER TABLE materials 
        ADD COLUMN material_type_id INT AFTER whse
      `);
      console.log('✅ Added material_type_id column\n');
    } else {
      console.log('✅ material_type_id column already exists\n');
    }

    // 3. Add foreign key constraint
    console.log('📝 Adding foreign key constraint...');
    try {
      await pool.query(`
        ALTER TABLE materials 
        ADD CONSTRAINT fk_material_type 
        FOREIGN KEY (material_type_id) REFERENCES material_types(id) ON DELETE SET NULL
      `);
      console.log('✅ Added foreign key constraint\n');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('✅ Foreign key constraint already exists\n');
      } else {
        console.log(`⚠️  Warning: ${error.message}\n`);
      }
    }

    // 4. Insert default material types
    console.log('📝 Inserting default material types...');
    const materialTypes = [
      ['Wood', 'Wood and wood products'],
      ['Cement', 'Cement and cement products'],
      ['Steel', 'Steel and metal reinforcement'],
      ['Aggregate', 'Sand, gravel, and aggregates'],
      ['Electrical', 'Electrical materials'],
      ['Plumbing', 'Plumbing and pipe materials'],
    ];

    for (const [typeName, description] of materialTypes) {
      await pool.query(
        'INSERT IGNORE INTO material_types (type_name, description) VALUES (?, ?)',
        [typeName, description]
      );
    }
    console.log('✅ Inserted 6 default material types\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Migration completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit();
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

migrate();
