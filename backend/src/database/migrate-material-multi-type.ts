import { pool } from '../config/database';

const migrate = async () => {
  console.log('🔧 Running material multi-type migration...\n');

  try {
    // 1. Check if material_type_relations table already exists
    const [tableCheck]: any = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'material_control'
        AND table_name = 'material_type_relations'
    `);

    if (tableCheck[0].count > 0) {
      console.log('✅ material_type_relations table already exists\n');
    } else {
      // 2. Create junction table
      console.log('📝 Creating material_type_relations table...');
      await pool.query(`
        CREATE TABLE material_type_relations (
          material_id INT NOT NULL,
          type_id INT NOT NULL,
          PRIMARY KEY (material_id, type_id),
          FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
          FOREIGN KEY (type_id) REFERENCES material_types(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created material_type_relations table\n');

      // 3. Migrate existing data from material_type_id to junction table
      console.log('📝 Migrating existing material_type_id data...');
      const [rows]: any = await pool.query(`
        SELECT id, material_type_id
        FROM materials
        WHERE material_type_id IS NOT NULL
      `);

      if (rows.length > 0) {
        for (const row of rows) {
          await pool.query(
            'INSERT IGNORE INTO material_type_relations (material_id, type_id) VALUES (?, ?)',
            [row.id, row.material_type_id]
          );
        }
        console.log(`✅ Migrated ${rows.length} material(s) to junction table\n`);
      } else {
        console.log('ℹ️  No existing material_type_id data to migrate\n');
      }

      // 4. Drop old foreign key constraint
      console.log('📝 Dropping old foreign key constraint...');
      try {
        await pool.query(`
          ALTER TABLE materials DROP FOREIGN KEY fk_material_type
        `);
        console.log('✅ Dropped old foreign key constraint\n');
      } catch (error: any) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('ℹ️  Foreign key constraint already dropped\n');
        } else {
          console.log(`⚠️  Warning: ${error.message}\n`);
        }
      }

      // 5. Drop old material_type_id column
      console.log('📝 Dropping material_type_id column...');
      try {
        await pool.query(`
          ALTER TABLE materials DROP COLUMN material_type_id
        `);
        console.log('✅ Dropped material_type_id column\n');
      } catch (error: any) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('ℹ️  material_type_id column already dropped\n');
        } else {
          console.log(`⚠️  Warning: ${error.message}\n`);
        }
      }
    }

    // 6. Create index on type_id for faster reverse lookups
    console.log('📝 Creating index on type_id...');
    const [indexCheck]: any = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.statistics
      WHERE table_schema = 'material_control'
        AND table_name = 'material_type_relations'
        AND index_name = 'idx_type_id'
    `);

    if (indexCheck[0].count === 0) {
      await pool.query(`
        CREATE INDEX idx_type_id ON material_type_relations (type_id)
      `);
      console.log('✅ Created index on type_id\n');
    } else {
      console.log('ℹ️  Index on type_id already exists\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Multi-type migration completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

migrate();
