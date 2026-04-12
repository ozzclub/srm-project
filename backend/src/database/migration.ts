import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: string | null;
  Extra: string;
}

interface IndexInfo {
  Key_name: string;
  Column_name: string;
  Non_unique: number;
}

export class MigrationService {
  // Check if table exists
  static async tableExists(tableName: string): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [tableName]
    );
    return rows[0].count > 0;
  }

  // Get existing columns
  static async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
      [tableName]
    );
    return rows as unknown as ColumnInfo[];
  }

  // Get existing indexes
  static async getIndexes(tableName: string): Promise<IndexInfo[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SHOW INDEX FROM ??',
      [tableName]
    );
    return rows as unknown as IndexInfo[];
  }

  // Create table if not exists
  static async createTable(tableName: string, createSQL: string): Promise<boolean> {
    const exists = await this.tableExists(tableName);
    
    if (exists) {
      console.log(`  ⏭️  Table '${tableName}' already exists, checking for updates...`);
      return false;
    }

    await pool.query(createSQL);
    console.log(`  ✅ Created table: ${tableName}`);
    return true;
  }

  // Ensure column exists with correct type
  static async ensureColumn(tableName: string, columnName: string, definition: string): Promise<boolean> {
    const columns = await this.getColumns(tableName);
    const existingColumn = columns.find(col => col.Field === columnName);

    if (existingColumn) {
      // Column already exists, skip
      return false;
    }

    // Column doesn't exist, try to add it
    try {
      await pool.query<ResultSetHeader>(
        `ALTER TABLE ?? ADD COLUMN ?? ${definition}`,
        [tableName, columnName]
      );
      console.log(`    ✅ Added column: ${columnName}`);
      return true;
    } catch (error: any) {
      // If column already exists (race condition), ignore the error
      if (error.code === 'ER_DUP_FIELDNAME') {
        return false;
      }
      throw error;
    }
  }

  // Create index if not exists
  static async ensureIndex(tableName: string, indexName: string, columns: string[], unique: boolean = false): Promise<boolean> {
    const indexes = await this.getIndexes(tableName);
    const existingIndex = indexes.find(idx => idx.Key_name === indexName);

    if (existingIndex) {
      return false; // Index already exists
    }

    const uniqueKeyword = unique ? 'UNIQUE' : '';
    const columnList = columns.join(', ');
    
    await pool.query(`CREATE ${uniqueKeyword} INDEX ?? ON ?? (${columnList})`, [indexName, tableName]);
    console.log(`    ✅ Created index: ${indexName}`);
    return true;
  }

  // Run all migrations
  static async runAllMigrations(): Promise<void> {
    console.log('\n🔍 Checking database structure...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let tablesCreated = 0;
    let columnsAdded = 0;
    let indexesCreated = 0;

    // 1. Users table
    try {
      if (!await this.tableExists('users')) {
        await this.createTable('users', `
          CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'staff') DEFAULT 'staff',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        tablesCreated++;
      } else {
        console.log('  ✅ users table exists');
      }
    } catch (error: any) {
      console.log(`  ⚠️  users table check skipped: ${error.message}`);
    }

    // 2. Material Types table (NEW)
    try {
      if (!await this.tableExists('material_types')) {
        await this.createTable('material_types', `
          CREATE TABLE material_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type_name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        tablesCreated++;
      } else {
        console.log('  ✅ material_types table exists');
      }
    } catch (error: any) {
      console.log(`  ⚠️  material_types table check skipped: ${error.message}`);
    }

    // 3. Materials table
    try {
      if (!await this.tableExists('materials')) {
        await this.createTable('materials', `
          CREATE TABLE materials (
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
        tablesCreated++;
      } else {
        console.log('  ✅ materials table exists');
        // Check if migration is needed (old columns still exist)
        const columns = await this.getColumns('materials');
        const hasOldColumns = columns.some(col => col.Field === 'material_name' || col.Field === 'specification');

        if (hasOldColumns) {
          console.log('  🔄 Migrating materials table structure...');

          // Rename material_name to description
          if (columns.some(col => col.Field === 'material_name')) {
            await pool.query(`ALTER TABLE materials CHANGE COLUMN material_name description VARCHAR(255) NOT NULL`);
            console.log('    ✅ Renamed material_name to description');
          }

          // Rename specification to remarks
          if (columns.some(col => col.Field === 'specification')) {
            await pool.query(`ALTER TABLE materials CHANGE COLUMN specification remarks TEXT`);
            console.log('    ✅ Renamed specification to remarks');
          }

          // Add unit_price if not exists
          if (!columns.some(col => col.Field === 'unit_price')) {
            await pool.query(`ALTER TABLE materials ADD COLUMN unit_price DECIMAL(15, 2) DEFAULT 0.00 AFTER unit`);
            console.log('    ✅ Added unit_price column');
          }

          // Add whse if not exists
          if (!columns.some(col => col.Field === 'whse')) {
            await pool.query(`ALTER TABLE materials ADD COLUMN whse VARCHAR(50) AFTER unit_price`);
            console.log('    ✅ Added whse column');
          }
        }

        // Add material_type_id if not exists
        if (!columns.some(col => col.Field === 'material_type_id')) {
          await pool.query(`ALTER TABLE materials ADD COLUMN material_type_id INT AFTER whse`);
          console.log('    ✅ Added material_type_id column');
          
          // Add foreign key constraint
          try {
            await pool.query(`ALTER TABLE materials ADD FOREIGN KEY (material_type_id) REFERENCES material_types(id) ON DELETE SET NULL`);
            console.log('    ✅ Added foreign key constraint for material_type_id');
          } catch (error: any) {
            console.log(`    ⚠️  Foreign key may already exist: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`  ⚠️  materials table check skipped: ${error.message}`);
    }

    // 4. Locations table
    try {
      if (!await this.tableExists('locations')) {
        await this.createTable('locations', `
          CREATE TABLE locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            location_name VARCHAR(100) NOT NULL,
            location_type ENUM('warehouse', 'workshop', 'site') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        tablesCreated++;
      } else {
        console.log('  ✅ locations table exists');
      }
    } catch (error: any) {
      console.log(`  ⚠️  locations table check skipped: ${error.message}`);
    }

    // 5. Movement types table
    try {
      if (!await this.tableExists('movement_types')) {
        await this.createTable('movement_types', `
          CREATE TABLE movement_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL
          )
        `);
        tablesCreated++;
      } else {
        console.log('  ✅ movement_types table exists');
      }
    } catch (error: any) {
      console.log(`  ⚠️  movement_types table check skipped: ${error.message}`);
    }

    // 6. Movement log table (CORE TABLE)
    try {
      if (!await this.tableExists('movement_log')) {
        await this.createTable('movement_log', `
          CREATE TABLE movement_log (
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
        tablesCreated++;
      } else {
        console.log('  ✅ movement_log table exists');
      }
    } catch (error: any) {
      console.log(`  ⚠️  movement_log table check skipped: ${error.message}`);
    }

    // 7. Documents table
    try {
      if (!await this.tableExists('documents')) {
        await this.createTable('documents', `
          CREATE TABLE documents (
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
        tablesCreated++;
      } else {
        console.log('  ✅ documents table exists');
      }
    } catch (error: any) {
      console.log(`  ⚠️  documents table check skipped: ${error.message}`);
    }

    // Create indexes for better performance
    console.log('\n📊 Checking indexes...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      if (await this.tableExists('movement_log')) {
        if (await this.ensureIndex('movement_log', 'idx_transaction_id', ['transaction_id'])) indexesCreated++;
        if (await this.ensureIndex('movement_log', 'idx_transaction_date', ['transaction_date'])) indexesCreated++;
        if (await this.ensureIndex('movement_log', 'idx_material_id', ['material_id'])) indexesCreated++;
      }
    } catch (error: any) {
      console.log(`  ⚠️  movement_log indexes check skipped: ${error.message}`);
    }

    try {
      if (await this.tableExists('documents')) {
        if (await this.ensureIndex('documents', 'idx_document_transaction_id', ['transaction_id'])) indexesCreated++;
      }
    } catch (error: any) {
      console.log(`  ⚠️  documents indexes check skipped: ${error.message}`);
    }

    // 8. Material multi-type migration (junction table)
    try {
      if (await this.tableExists('materials')) {
        const [tableCheck]: any = await pool.query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
            AND table_name = 'material_type_relations'
        `);

        if (tableCheck[0].count === 0) {
          console.log('  🔄 Creating material_type_relations table...');
          await pool.query(`
            CREATE TABLE material_type_relations (
              material_id INT NOT NULL,
              type_id INT NOT NULL,
              PRIMARY KEY (material_id, type_id),
              FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
              FOREIGN KEY (type_id) REFERENCES material_types(id) ON DELETE CASCADE
            )
          `);
          console.log('    ✅ Created material_type_relations table');

          // Migrate existing data
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
            console.log(`    ✅ Migrated ${rows.length} material(s) to junction table`);
          }

          // Drop old FK
          try {
            await pool.query(`ALTER TABLE materials DROP FOREIGN KEY fk_material_type`);
            console.log('    ✅ Dropped old foreign key constraint');
          } catch (e: any) {
            if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
              console.log(`    ⚠️  FK drop warning: ${e.message}`);
            }
          }

          // Drop old column
          try {
            await pool.query(`ALTER TABLE materials DROP COLUMN material_type_id`);
            console.log('    ✅ Dropped material_type_id column');
          } catch (e: any) {
            if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
              console.log(`    ⚠️  Column drop warning: ${e.message}`);
            }
          }

          // Create index
          const [idxCheck]: any = await pool.query(`
            SELECT COUNT(*) as count
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'material_type_relations'
              AND index_name = 'idx_type_id'
          `);
          if (idxCheck[0].count === 0) {
            await pool.query(`CREATE INDEX idx_type_id ON material_type_relations (type_id)`);
            console.log('    ✅ Created index on type_id');
          }
        } else {
          console.log('  ✅ material_type_relations table exists');
        }
      }
    } catch (error: any) {
      console.log(`  ⚠️  multi-type migration check skipped: ${error.message}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration completed!`);
    console.log(`   📋 Tables created/verified: ${tablesCreated}`);
    console.log(`   📊 Indexes created: ${indexesCreated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
