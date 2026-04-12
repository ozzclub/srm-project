import { pool } from '../../config/database';
import {
  MTORequest,
  MTOItem,
  MTORequestWithItems,
  CreateMTORequestDTO,
  UpdateMTORequestDTO,
  CreateMTOItemDTO,
  UpdateMTOItemDTO,
  MTOQueryParams,
  MTOFulfillmentStatus
} from '../../types/mto.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MTOService {
  // Generate unique MTO number with format: MTO-XXXXXXXX
  private static generateMTONumber(): string {
    const timestamp = Date.now().toString();
    const code = timestamp.slice(-8);
    return `MTO-${code}`;
  }

  // Get all MTO requests with pagination and filters
  static async getAllMTORequests(params: MTOQueryParams): Promise<{ data: MTORequestWithItems[]; total: number }> {
    const { page = 1, limit = 10, search, status, date_from, date_to, project_name } = params;
    const offset = (page - 1) * limit;

    // Build query with filters
    const conditions: string[] = [];
    const values: any[] = [];

    if (search) {
      conditions.push('(mr.mto_number LIKE ? OR mr.project_name LIKE ? OR mr.requested_by LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('mr.status = ?');
      values.push(status);
    }

    if (date_from) {
      conditions.push('mr.request_date >= ?');
      values.push(date_from);
    }

    if (date_to) {
      conditions.push('mr.request_date <= ?');
      values.push(date_to);
    }

    if (project_name) {
      conditions.push('mr.project_name LIKE ?');
      values.push(`%${project_name}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM mto_requests mr ${whereClause}`,
      values
    );
    const total = countRows[0].total;

    // Get MTO requests
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        mr.*,
        COUNT(mi.id) as total_items,
        SUM(CASE WHEN mi.fulfilled_qty >= mi.requested_qty THEN 1 ELSE 0 END) as completed_items,
        CASE 
          WHEN SUM(mi.requested_qty) > 0 
          THEN ROUND((SUM(mi.fulfilled_qty) / SUM(mi.requested_qty)) * 100, 2)
          ELSE 0 
        END as fulfillment_percentage
      FROM mto_requests mr
      LEFT JOIN mto_items mi ON mr.id = mi.mto_id
      ${whereClause}
      GROUP BY mr.id
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return { data: rows as unknown as MTORequestWithItems[], total };
  }

  // Get MTO request by ID with items
  static async getMTORequestById(id: number): Promise<MTORequestWithItems | null> {
    // Get MTO request
    const [mtoRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM mto_requests WHERE id = ?',
      [id]
    );

    if (mtoRows.length === 0) return null;

    const mtoRequest = mtoRows[0] as unknown as MTORequest;

    // Get MTO items with material info
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT
        mi.*,
        m.id as material_id,
        m.material_code,
        m.description,
        m.remarks,
        mat_type.id as material_type_id,
        mat_type.type_name,
        mat_type.description as material_type_description
      FROM mto_items mi
      LEFT JOIN materials m ON mi.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      WHERE mi.mto_id = ?
      ORDER BY mi.created_at ASC`,
      [id]
    );

    const items: MTOItem[] = itemRows.map((row: any) => ({
      id: row.id,
      mto_id: row.mto_id,
      material_id: row.material_id,
      requested_qty: row.requested_qty,
      fulfilled_qty: row.fulfilled_qty,
      unit: row.unit,
      notes: row.notes,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
    }));

    // Calculate fulfillment percentage
    const totalRequested = items.reduce((sum, item) => sum + item.requested_qty, 0);
    const totalFulfilled = items.reduce((sum, item) => sum + item.fulfilled_qty, 0);
    const fulfillmentPercentage = totalRequested > 0 ? (totalFulfilled / totalRequested) * 100 : 0;

    return {
      ...mtoRequest,
      items,
      fulfillment_percentage: Math.round(fulfillmentPercentage * 100) / 100,
      total_items: items.length,
      completed_items: items.filter(item => item.fulfilled_qty >= item.requested_qty).length,
    };
  }

  // Get MTO request by MTO number
  static async getMTORequestByNumber(mtoNumber: string): Promise<MTORequestWithItems | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM mto_requests WHERE mto_number = ?',
      [mtoNumber]
    );

    if (rows.length === 0) return null;

    return this.getMTORequestById(rows[0].id);
  }

  // Create MTO request with items
  static async createMTORequest(data: CreateMTORequestDTO): Promise<MTORequestWithItems> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Generate MTO number if not provided
      const mtoNumber = (!data.mto_number || data.mto_number.trim() === '')
        ? this.generateMTONumber()
        : data.mto_number;

      // Insert MTO request
      const [mtoResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO mto_requests (mto_number, project_name, work_order_no, request_date, required_date, requested_by, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          mtoNumber,
          data.project_name,
          data.work_order_no || null,
          data.request_date,
          data.required_date || null,
          data.requested_by,
          data.notes || null,
          data.created_by || null,
        ]
      );

      const mtoId = mtoResult.insertId;

      // Insert MTO items
      for (const item of data.items) {
        // Get material unit
        const [materialRows] = await connection.query<RowDataPacket[]>(
          'SELECT unit FROM materials WHERE id = ?',
          [item.material_id]
        );

        if (materialRows.length === 0) {
          throw new Error(`Material with ID ${item.material_id} not found`);
        }

        await connection.query<ResultSetHeader>(
          'INSERT INTO mto_items (mto_id, material_id, requested_qty, unit, notes) VALUES (?, ?, ?, ?, ?)',
          [
            mtoId,
            item.material_id,
            item.requested_qty,
            materialRows[0].unit,
            item.notes || null,
          ]
        );
      }

      await connection.commit();

      // Get the created MTO request
      const mtoRequest = await this.getMTORequestById(mtoId);
      if (!mtoRequest) throw new Error('Failed to create MTO request');

      return mtoRequest;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update MTO request
  static async updateMTORequest(id: number, data: UpdateMTORequestDTO): Promise<MTORequest | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.project_name !== undefined) {
      fields.push('project_name = ?');
      values.push(data.project_name);
    }
    if (data.work_order_no !== undefined) {
      fields.push('work_order_no = ?');
      values.push(data.work_order_no);
    }
    if (data.request_date !== undefined) {
      fields.push('request_date = ?');
      values.push(data.request_date);
    }
    if (data.required_date !== undefined) {
      fields.push('required_date = ?');
      values.push(data.required_date);
    }
    if (data.requested_by !== undefined) {
      fields.push('requested_by = ?');
      values.push(data.requested_by);
    }
    if (data.approved_by !== undefined) {
      fields.push('approved_by = ?');
      values.push(data.approved_by);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.getMTORequestById(id).then(result => result || null);
    }

    values.push(id);

    await pool.query<ResultSetHeader>(
      `UPDATE mto_requests SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getMTORequestById(id).then(result => result || null);
  }

  // Delete MTO request
  static async deleteMTORequest(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM mto_requests WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  // Add item to MTO request
  static async addMTOItem(mtoId: number, data: CreateMTOItemDTO): Promise<MTOItem> {
    // Check if MTO request exists
    const [mtoRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM mto_requests WHERE id = ?',
      [mtoId]
    );

    if (mtoRows.length === 0) {
      throw new Error('MTO request not found');
    }

    // Get material unit
    const [materialRows] = await pool.query<RowDataPacket[]>(
      'SELECT unit FROM materials WHERE id = ?',
      [data.material_id]
    );

    if (materialRows.length === 0) {
      throw new Error('Material not found');
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO mto_items (mto_id, material_id, requested_qty, unit, notes) VALUES (?, ?, ?, ?, ?)',
      [
        mtoId,
        data.material_id,
        data.requested_qty,
        materialRows[0].unit,
        data.notes || null,
      ]
    );

    const newItem = await this.getMTOItemById(result.insertId);
    if (!newItem) throw new Error('Failed to create MTO item');

    return newItem;
  }

  // Update MTO item
  static async updateMTOItem(id: number, data: UpdateMTOItemDTO): Promise<MTOItem | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.material_id !== undefined) {
      // Get new material unit
      const [materialRows] = await pool.query<RowDataPacket[]>(
        'SELECT unit FROM materials WHERE id = ?',
        [data.material_id]
      );

      if (materialRows.length > 0) {
        fields.push('material_id = ?', 'unit = ?');
        values.push(data.material_id, materialRows[0].unit);
      }
    }
    if (data.requested_qty !== undefined) {
      fields.push('requested_qty = ?');
      values.push(data.requested_qty);
    }
    if (data.fulfilled_qty !== undefined) {
      fields.push('fulfilled_qty = ?');
      values.push(data.fulfilled_qty);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.getMTOItemById(id);
    }

    values.push(id);

    await pool.query<ResultSetHeader>(
      `UPDATE mto_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getMTOItemById(id);
  }

  // Delete MTO item
  static async deleteMTOItem(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM mto_items WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  // Get MTO item by ID
  static async getMTOItemById(id: number): Promise<MTOItem | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        mi.*,
        m.id as material_id,
        m.material_code,
        m.description,
        m.remarks,
        mat_type.id as material_type_id,
        mat_type.type_name,
        mat_type.description as material_type_description
      FROM mto_items mi
      LEFT JOIN materials m ON mi.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      WHERE mi.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    return {
      id: row.id,
      mto_id: row.mto_id,
      material_id: row.material_id,
      requested_qty: row.requested_qty,
      fulfilled_qty: row.fulfilled_qty,
      unit: row.unit,
      notes: row.notes,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
    };
  }

  // Update MTO fulfillment and recalculate status
  static async updateMTOfulfillment(mtoItemId: number, qty: number): Promise<void> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Update fulfilled_qty
      await connection.query(
        'UPDATE mto_items SET fulfilled_qty = fulfilled_qty + ? WHERE id = ?',
        [qty, mtoItemId]
      );

      // Get MTO ID
      const [itemRows] = await connection.query<RowDataPacket[]>(
        'SELECT mto_id FROM mto_items WHERE id = ?',
        [mtoItemId]
      );

      if (itemRows.length === 0) {
        throw new Error('MTO item not found');
      }

      const mtoId = itemRows[0].mto_id;

      // Recalculate MTO status
      await this.recalculateMTOStatus(mtoId, connection);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Recalculate MTO status based on fulfillment
  static async recalculateMTOStatus(mtoId: number, connection?: any): Promise<void> {
    const conn = connection || await pool.getConnection();

    try {
      // Get all items for this MTO
      const [itemRows] = await conn.query(
        'SELECT requested_qty, fulfilled_qty FROM mto_items WHERE mto_id = ?',
        [mtoId]
      );

      if (itemRows.length === 0) {
        // No items, keep status as is
        return;
      }

      const totalRequested = itemRows.reduce((sum: number, item: any) => sum + item.requested_qty, 0);
      const totalFulfilled = itemRows.reduce((sum: number, item: any) => sum + item.fulfilled_qty, 0);

      let newStatus: 'DRAFT' | 'APPROVED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED' = 'APPROVED';

      if (totalFulfilled === 0) {
        newStatus = 'APPROVED';
      } else if (totalFulfilled >= totalRequested) {
        newStatus = 'COMPLETED';
      } else {
        newStatus = 'PARTIAL';
      }

      // Update status
      await conn.query(
        'UPDATE mto_requests SET status = ? WHERE id = ?',
        [newStatus, mtoId]
      );
    } finally {
      if (!connection) {
        conn.release();
      }
    }
  }

  // Get MTO fulfillment status
  static async getMTOFulfillmentStatus(mtoId: number): Promise<MTOFulfillmentStatus | null> {
    const mtoRequest = await this.getMTORequestById(mtoId);
    if (!mtoRequest) return null;

    const items = mtoRequest.items.map(item => ({
      item_id: item.id,
      material_id: item.material_id,
      material_name: item.material?.description || 'Unknown',
      requested_qty: item.requested_qty,
      fulfilled_qty: item.fulfilled_qty,
      remaining_qty: Math.max(0, item.requested_qty - item.fulfilled_qty),
      unit: item.unit,
    }));

    const totalRequested = items.reduce((sum, item) => sum + item.requested_qty, 0);
    const totalFulfilled = items.reduce((sum, item) => sum + item.fulfilled_qty, 0);

    return {
      mto_id: mtoId,
      mto_number: mtoRequest.mto_number,
      total_requested: totalRequested,
      total_fulfilled: totalFulfilled,
      fulfillment_percentage: totalRequested > 0 ? (totalFulfilled / totalRequested) * 100 : 0,
      items,
    };
  }

  // Get MTO requests by project name
  static async getMTORequestsByProject(projectName: string): Promise<MTORequestWithItems[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        mr.*,
        COUNT(mi.id) as total_items,
        SUM(CASE WHEN mi.fulfilled_qty >= mi.requested_qty THEN 1 ELSE 0 END) as completed_items,
        CASE 
          WHEN SUM(mi.requested_qty) > 0 
          THEN ROUND((SUM(mi.fulfilled_qty) / SUM(mi.requested_qty)) * 100, 2)
          ELSE 0 
        END as fulfillment_percentage
      FROM mto_requests mr
      LEFT JOIN mto_items mi ON mr.id = mi.mto_id
      WHERE mr.project_name LIKE ?
      GROUP BY mr.id
      ORDER BY mr.created_at DESC`,
      [`%${projectName}%`]
    );

    return rows as unknown as MTORequestWithItems[];
  }
}
