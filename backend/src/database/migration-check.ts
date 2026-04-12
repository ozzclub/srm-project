import { MigrationService } from './migration';
import { pool } from '../config/database';

const checkDatabase = async () => {
  console.log('\n🔍 Database Structure Checker');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Test connection
    await pool.getConnection();
    console.log('✅ Database connection successful\n');

    // Check all tables
    const tables = ['users', 'materials', 'locations', 'movement_types', 'movement_log', 'documents'];
    
    console.log('📊 Table Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const table of tables) {
      const exists = await MigrationService.tableExists(table);
      const status = exists ? '✅ EXISTS' : '❌ MISSING';
      console.log(`  ${table.padEnd(20)} ${status}`);
      
      if (exists) {
        const columns = await MigrationService.getColumns(table);
        console.log(`    └─ ${columns.length} columns`);
        
        const indexes = await MigrationService.getIndexes(table);
        const uniqueIndexes = new Set(indexes.map(i => i.Key_name)).size;
        console.log(`    └─ ${uniqueIndexes} index(es)`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database check completed\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database check failed:', error);
    process.exit(1);
  }
};

checkDatabase();
