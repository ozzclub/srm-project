import { pool } from '../config/database';
import bcrypt from 'bcrypt';

const seed = async () => {
  console.log('🌱 Starting database seeding...');

  try {
    // Check if data already exists
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    if ((users as any)[0].count > 0) {
      console.log('⚠️  Database already has data. Skipping seed.');
      process.exit();
      return;
    }

    // Seed movement types
    const movementTypes = [
      'DIRECT_DELIVERY',
      'TRANSFER',
      'ISSUE_TO_SITE',
      'RETURN',
      'ADJUSTMENT',
    ];

    for (const name of movementTypes) {
      await pool.query('INSERT INTO movement_types (name) VALUES (?)', [name]);
    }
    console.log('✅ Seeded movement types');

    // Seed default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Administrator', 'admin@materialcontrol.com', hashedPassword, 'admin']
    );
    console.log('✅ Seeded admin user (email: admin@materialcontrol.com, password: admin123)');

    // Seed sample locations
    const locations = [
      { name: 'Main Warehouse', type: 'warehouse' },
      { name: 'Workshop A', type: 'workshop' },
      { name: 'Construction Site 1', type: 'site' },
      { name: 'Construction Site 2', type: 'site' },
    ];

    for (const location of locations) {
      await pool.query(
        'INSERT INTO locations (location_name, location_type) VALUES (?, ?)',
        [location.name, location.type]
      );
    }
    console.log('✅ Seeded locations');

    // Seed material types
    const materialTypes = [
      { name: 'Wood', description: 'Wood and wood products' },
      { name: 'Cement', description: 'Cement and cement products' },
      { name: 'Steel', description: 'Steel and metal reinforcement' },
      { name: 'Aggregate', description: 'Sand, gravel, and aggregates' },
      { name: 'Electrical', description: 'Electrical materials' },
      { name: 'Plumbing', description: 'Plumbing and pipe materials' },
    ];

    for (const type of materialTypes) {
      await pool.query(
        'INSERT INTO material_types (type_name, description) VALUES (?, ?)',
        [type.name, type.description]
      );
    }
    console.log('✅ Seeded material types');

    // Seed sample materials
    const materials = [
      { code: 'PLY-001', desc: 'Plywood', remarks: '18mm x 1220mm x 2440mm', unit: 'Sheet', price: 25.50, whse: 'WH-01', type: 'Wood' },
      { code: 'CEM-001', desc: 'Cement', remarks: 'Portland Cement Type I', unit: 'Bag', price: 12.00, whse: 'WH-01', type: 'Cement' },
      { code: 'STL-001', desc: 'Steel Rebar', remarks: '12mm diameter', unit: 'Bar', price: 8.75, whse: 'WH-02', type: 'Steel' },
      { code: 'SND-001', desc: 'Sand', remarks: 'River Sand', unit: 'm³', price: 45.00, whse: 'WH-03', type: 'Aggregate' },
      { code: 'GRV-001', desc: 'Gravel', remarks: '20mm aggregate', unit: 'm³', price: 55.00, whse: 'WH-03', type: 'Aggregate' },
    ];

    for (const material of materials) {
      await pool.query(
        `INSERT INTO materials (material_code, description, remarks, unit, unit_price, whse, material_type_id) 
         VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM material_types WHERE type_name = ?))`,
        [material.code, material.desc, material.remarks, material.unit, material.price, material.whse, material.type]
      );
    }
    console.log('✅ Seeded materials');

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    process.exit();
  }
};

seed();
