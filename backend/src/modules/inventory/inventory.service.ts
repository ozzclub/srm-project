import { pool } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  Inventory,
  InventoryQueryParams,
  CreateInventoryDTO,
} from '../../types/spp.types';

export class InventoryService {
  // Get all inventory items
  static async getAllInventory(params: InventoryQueryParams = {}): Promise<{
    data: Inventory[];
    total: number;
  }> {
    const { location_id, material_id, item_type, condition_status } = params;

    let query = `
      SELECT 
        i.*,
        m.material_code,
        m.description as material_description,
        l.location_name
      FROM inventory i
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN locations l ON i.location_id = l.id
    `;

    let countQuery = `SELECT COUNT(*) as total FROM inventory i`;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (location_id) {
      conditions.push('i.location_id = ?');
      queryParams.push(location_id);
    }

    if (material_id) {
      conditions.push('i.material_id = ?');
      queryParams.push(material_id);
    }

    if (item_type) {
      conditions.push('i.item_type = ?');
      queryParams.push(item_type);
    }

    if (condition_status) {
      conditions.push('i.condition_status = ?');
      queryParams.push(condition_status);
    }

    if (conditions.length > 0) {
      const whereClause = 'WHERE ' + conditions.join(' AND ');
      query += ' ' + whereClause;
      countQuery += ' ' + whereClause;
    }

    query += ' ORDER BY i.created_at DESC';

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(countQuery, queryParams);
    const total = countRows[0].total;

    // Get data
    const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);

    const data: Inventory[] = rows.map((row: any) => ({
      id: row.id,
      spp_item_id: row.spp_item_id,
      material_id: row.material_id,
      item_type: row.item_type,
      quantity: parseFloat(row.quantity),
      condition_status: row.condition_status,
      location_id: row.location_id,
      received_from_spp: row.received_from_spp,
      received_at: row.received_at,
      created_at: row.created_at,
    }));

    return { data, total };
  }

  // Get inventory by ID
  static async getInventoryById(id: number): Promise<Inventory | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        i.*,
        m.material_code,
        m.description as material_description,
        l.location_name
      FROM inventory i
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    return rows[0] as Inventory;
  }

  // Get tools only
  static async getTools(): Promise<Inventory[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        i.*,
        m.material_code,
        m.description as material_description,
        l.location_name
      FROM inventory i
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.item_type = 'TOOL'
      ORDER BY i.created_at DESC`
    );

    return rows.map((row: any) => ({
      id: row.id,
      spp_item_id: row.spp_item_id,
      material_id: row.material_id,
      item_type: row.item_type,
      quantity: parseFloat(row.quantity),
      condition_status: row.condition_status,
      location_id: row.location_id,
      received_from_spp: row.received_from_spp,
      received_at: row.received_at,
      created_at: row.created_at,
    }));
  }

  // Get materials only (consumables)
  static async getMaterials(): Promise<Inventory[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        i.*,
        m.material_code,
        m.description as material_description,
        l.location_name
      FROM inventory i
      LEFT JOIN materials m ON i.material_id = m.id
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.item_type = 'MATERIAL'
      ORDER BY i.created_at DESC`
    );

    return rows.map((row: any) => ({
      id: row.id,
      spp_item_id: row.spp_item_id,
      material_id: row.material_id,
      item_type: row.item_type,
      quantity: parseFloat(row.quantity),
      condition_status: row.condition_status,
      location_id: row.location_id,
      received_from_spp: row.received_from_spp,
      received_at: row.received_at,
      created_at: row.created_at,
    }));
  }

  // Create inventory item (usually called automatically from SPP approval)
  static async createInventory(data: CreateInventoryDTO): Promise<Inventory> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO inventory (spp_item_id, material_id, item_type, quantity, condition_status, location_id, received_from_spp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        data.spp_item_id,
        data.material_id || null,
        data.item_type,
        data.quantity,
        data.condition_status || 'GOOD',
        data.location_id || null,
        data.received_from_spp,
      ]
    );

    const inventory = await this.getInventoryById(result.insertId);
    if (!inventory) throw new Error('Failed to retrieve created inventory');

    return inventory;
  }

  // Update inventory item
  static async updateInventory(
    id: number,
    data: Partial<Inventory>
  ): Promise<Inventory | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(data.quantity);
    }
    if (data.condition_status) {
      fields.push('condition_status = ?');
      values.push(data.condition_status);
    }
    if (data.location_id !== undefined) {
      fields.push('location_id = ?');
      values.push(data.location_id);
    }

    if (fields.length === 0) {
      return this.getInventoryById(id);
    }

    values.push(id);

    await pool.query(
      `UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getInventoryById(id);
  }

  // Delete inventory item
  static async deleteInventory(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM inventory WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Get inventory summary statistics
  static async getInventoryStats(): Promise<any> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN item_type = 'TOOL' THEN 1 ELSE 0 END) as total_tools,
        SUM(CASE WHEN item_type = 'MATERIAL' THEN 1 ELSE 0 END) as total_materials,
        SUM(CASE WHEN condition_status = 'GOOD' THEN 1 ELSE 0 END) as good_condition,
        SUM(CASE WHEN condition_status = 'DAMAGED' THEN 1 ELSE 0 END) as damaged,
        SUM(CASE WHEN condition_status = 'CONSUMED' THEN 1 ELSE 0 END) as consumed
      FROM inventory`
    );

    return rows[0];
  }
}
