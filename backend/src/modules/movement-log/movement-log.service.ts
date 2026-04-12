import { pool } from '../../config/database';
import {
  MovementLog,
  MovementLogWithRelations,
  CreateMovementLogDTO,
  UpdateMovementLogDTO,
  MovementLogQueryParams
} from '../../types/movement-log.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { MTOService } from '../mto/mto.service';

export class MovementLogService {
  // Get all movement logs with pagination and filters
  static async getAllMovementLogs(params: MovementLogQueryParams): Promise<{ data: MovementLogWithRelations[]; total: number }> {
    const { page = 1, limit = 10, search, date_from, date_to, material_id, movement_type_id, location_id } = params;
    const offset = (page - 1) * limit;

    // Build query with filters
    const conditions: string[] = [];
    const values: any[] = [];

    if (search) {
      conditions.push('(ml.transaction_id LIKE ? OR ml.document_no LIKE ? OR ml.vehicle_driver LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (date_from) {
      conditions.push('ml.transaction_date >= ?');
      values.push(date_from);
    }

    if (date_to) {
      conditions.push('ml.transaction_date <= ?');
      values.push(date_to);
    }

    if (material_id) {
      conditions.push('ml.material_id = ?');
      values.push(material_id);
    }

    if (movement_type_id) {
      conditions.push('ml.movement_type_id = ?');
      values.push(movement_type_id);
    }

    if (location_id) {
      conditions.push('(ml.from_location_id = ? OR ml.to_location_id = ?)');
      values.push(location_id, location_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM movement_log ml ${whereClause}`,
      values
    );
    const total = countRows[0].total;

    // Get data with relations
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        ml.*,
        m.id as material_id, m.material_code, m.description, m.remarks, m.unit, m.unit_price, m.whse,
        mat_type.id as material_type_id, mat_type.type_name, mat_type.description as material_type_description,
        fl.id as from_location_id, fl.location_name as from_location_name, fl.location_type as from_location_type,
        tl.id as to_location_id, tl.location_name as to_location_name, tl.location_type as to_location_type,
        mt.id as movement_type_id, mt.name as movement_type_name,
        u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
        mto_item.id as mto_item_id, mto_item.mto_id, mto_req.mto_number, mto_item.requested_qty as mto_requested_qty, mto_item.fulfilled_qty as mto_fulfilled_qty
      FROM movement_log ml
      LEFT JOIN materials m ON ml.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      LEFT JOIN locations fl ON ml.from_location_id = fl.id
      LEFT JOIN locations tl ON ml.to_location_id = tl.id
      LEFT JOIN movement_types mt ON ml.movement_type_id = mt.id
      LEFT JOIN users u ON ml.created_by = u.id
      LEFT JOIN mto_items mto_item ON ml.mto_item_id = mto_item.id
      LEFT JOIN mto_requests mto_req ON mto_item.mto_id = mto_req.id
      ${whereClause}
      ORDER BY ml.created_at DESC
      LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    // Transform data
    const data: MovementLogWithRelations[] = rows.map((row: any) => ({
      id: row.id,
      transaction_id: row.transaction_id,
      transaction_date: row.transaction_date,
      trip_id: row.trip_id,
      document_no: row.document_no,
      material_id: row.material_id,
      qty: row.qty,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      movement_type_id: row.movement_type_id,
      vehicle_driver: row.vehicle_driver,
      received_by: row.received_by,
      loading_time: row.loading_time,
      unloading_time: row.unloading_time,
      condition_notes: row.condition_notes,
      documentation_link: row.documentation_link,
      mto_item_id: row.mto_item_id,
      created_by: row.created_by,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        unit: row.unit,
        unit_price: row.unit_price,
        whse: row.whse,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
      from_location: row.from_location_name ? {
        id: row.from_location_id,
        location_name: row.from_location_name,
        location_type: row.from_location_type,
      } : undefined,
      to_location: row.to_location_name ? {
        id: row.to_location_id,
        location_name: row.to_location_name,
        location_type: row.to_location_type,
      } : undefined,
      movement_type: row.movement_type_name ? {
        id: row.movement_type_id,
        name: row.movement_type_name,
      } : undefined,
      created_by_user: row.created_by_name ? {
        id: row.created_by_id,
        name: row.created_by_name,
        email: row.created_by_email,
      } : undefined,
      mto_item: row.mto_item_id ? {
        id: row.mto_item_id,
        mto_id: row.mto_id,
        mto_number: row.mto_number,
        requested_qty: row.mto_requested_qty,
        fulfilled_qty: row.mto_fulfilled_qty,
      } : undefined,
    }));

    return { data, total };
  }

  // Get movement log by ID
  static async getMovementLogById(id: number): Promise<MovementLogWithRelations | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        ml.*,
        m.id as material_id, m.material_code, m.description, m.remarks, m.unit, m.unit_price, m.whse,
        mat_type.id as material_type_id, mat_type.type_name, mat_type.description as material_type_description,
        fl.id as from_location_id, fl.location_name as from_location_name, fl.location_type as from_location_type,
        tl.id as to_location_id, tl.location_name as to_location_name, tl.location_type as to_location_type,
        mt.id as movement_type_id, mt.name as movement_type_name,
        u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
        mto_item.id as mto_item_id, mto_item.mto_id, mto_req.mto_number, mto_item.requested_qty as mto_requested_qty, mto_item.fulfilled_qty as mto_fulfilled_qty
      FROM movement_log ml
      LEFT JOIN materials m ON ml.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      LEFT JOIN locations fl ON ml.from_location_id = fl.id
      LEFT JOIN locations tl ON ml.to_location_id = tl.id
      LEFT JOIN movement_types mt ON ml.movement_type_id = mt.id
      LEFT JOIN users u ON ml.created_by = u.id
      LEFT JOIN mto_items mto_item ON ml.mto_item_id = mto_item.id
      LEFT JOIN mto_requests mto_req ON mto_item.mto_id = mto_req.id
      WHERE ml.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    return {
      id: row.id,
      transaction_id: row.transaction_id,
      transaction_date: row.transaction_date,
      trip_id: row.trip_id,
      document_no: row.document_no,
      material_id: row.material_id,
      qty: row.qty,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      movement_type_id: row.movement_type_id,
      vehicle_driver: row.vehicle_driver,
      received_by: row.received_by,
      loading_time: row.loading_time,
      unloading_time: row.unloading_time,
      condition_notes: row.condition_notes,
      documentation_link: row.documentation_link,
      mto_item_id: row.mto_item_id,
      created_by: row.created_by,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        unit: row.unit,
        unit_price: row.unit_price,
        whse: row.whse,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
      from_location: row.from_location_name ? {
        id: row.from_location_id,
        location_name: row.from_location_name,
        location_type: row.from_location_type,
      } : undefined,
      to_location: row.to_location_name ? {
        id: row.to_location_id,
        location_name: row.to_location_name,
        location_type: row.to_location_type,
      } : undefined,
      movement_type: row.movement_type_name ? {
        id: row.movement_type_id,
        name: row.movement_type_name,
      } : undefined,
      created_by_user: row.created_by_name ? {
        id: row.created_by_id,
        name: row.created_by_name,
        email: row.created_by_email,
      } : undefined,
      mto_item: row.mto_item_id ? {
        id: row.mto_item_id,
        mto_id: row.mto_id,
        mto_number: row.mto_number,
        requested_qty: row.mto_requested_qty,
        fulfilled_qty: row.mto_fulfilled_qty,
      } : undefined,
    };
  }

  // Get movement log by transaction ID
  static async getMovementLogByTransactionId(transactionId: string): Promise<MovementLogWithRelations | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        ml.*,
        m.id as material_id, m.material_code, m.description, m.remarks, m.unit, m.unit_price, m.whse,
        mat_type.id as material_type_id, mat_type.type_name, mat_type.description as material_type_description,
        fl.id as from_location_id, fl.location_name as from_location_name, fl.location_type as from_location_type,
        tl.id as to_location_id, tl.location_name as to_location_name, tl.location_type as to_location_type,
        mt.id as movement_type_id, mt.name as movement_type_name,
        u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
        mto_item.id as mto_item_id, mto_item.mto_id, mto_req.mto_number, mto_item.requested_qty as mto_requested_qty, mto_item.fulfilled_qty as mto_fulfilled_qty
      FROM movement_log ml
      LEFT JOIN materials m ON ml.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      LEFT JOIN locations fl ON ml.from_location_id = fl.id
      LEFT JOIN locations tl ON ml.to_location_id = tl.id
      LEFT JOIN movement_types mt ON ml.movement_type_id = mt.id
      LEFT JOIN users u ON ml.created_by = u.id
      LEFT JOIN mto_items mto_item ON ml.mto_item_id = mto_item.id
      LEFT JOIN mto_requests mto_req ON mto_item.mto_id = mto_req.id
      WHERE ml.transaction_id = ?`,
      [transactionId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];

    return {
      id: row.id,
      transaction_id: row.transaction_id,
      transaction_date: row.transaction_date,
      trip_id: row.trip_id,
      document_no: row.document_no,
      material_id: row.material_id,
      qty: row.qty,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      movement_type_id: row.movement_type_id,
      vehicle_driver: row.vehicle_driver,
      received_by: row.received_by,
      loading_time: row.loading_time,
      unloading_time: row.unloading_time,
      condition_notes: row.condition_notes,
      documentation_link: row.documentation_link,
      mto_item_id: row.mto_item_id,
      created_by: row.created_by,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        unit: row.unit,
        unit_price: row.unit_price,
        whse: row.whse,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
      from_location: row.from_location_name ? {
        id: row.from_location_id,
        location_name: row.from_location_name,
        location_type: row.from_location_type,
      } : undefined,
      to_location: row.to_location_name ? {
        id: row.to_location_id,
        location_name: row.to_location_name,
        location_type: row.to_location_type,
      } : undefined,
      movement_type: row.movement_type_name ? {
        id: row.movement_type_id,
        name: row.movement_type_name,
      } : undefined,
      created_by_user: row.created_by_name ? {
        id: row.created_by_id,
        name: row.created_by_name,
        email: row.created_by_email,
      } : undefined,
      mto_item: row.mto_item_id ? {
        id: row.mto_item_id,
        mto_id: row.mto_id,
        mto_number: row.mto_number,
        requested_qty: row.mto_requested_qty,
        fulfilled_qty: row.mto_fulfilled_qty,
      } : undefined,
    };
  }

  // Create movement log
  static async createMovementLog(data: CreateMovementLogDTO): Promise<MovementLog> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO movement_log (
          transaction_id, transaction_date, trip_id, document_no, material_id, qty,
          from_location_id, to_location_id, movement_type_id, vehicle_driver,
          received_by, loading_time, unloading_time, condition_notes,
          documentation_link, mto_item_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.transaction_id,
          data.transaction_date,
          data.trip_id || null,
          data.document_no || null,
          data.material_id || null,
          data.qty || null,
          data.from_location_id || null,
          data.to_location_id || null,
          data.movement_type_id || null,
          data.vehicle_driver || null,
          data.received_by || null,
          data.loading_time || null,
          data.unloading_time || null,
          data.condition_notes || null,
          data.documentation_link || null,
          data.mto_item_id || null,
          data.created_by || null,
        ]
      );

      // If this movement log is linked to an MTO item, update MTO fulfillment
      if (data.mto_item_id && data.qty) {
        await MTOService.updateMTOfulfillment(data.mto_item_id, data.qty);
      }

      await connection.commit();

      const newMovementLog = await this.getMovementLogById(result.insertId);
      if (!newMovementLog) throw new Error('Failed to create movement log');

      return newMovementLog;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update movement log
  static async updateMovementLog(id: number, data: UpdateMovementLogDTO): Promise<MovementLogWithRelations | null> {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'transaction_id', 'transaction_date', 'trip_id', 'document_no',
      'material_id', 'qty', 'from_location_id', 'to_location_id',
      'movement_type_id', 'vehicle_driver', 'received_by', 'loading_time',
      'unloading_time', 'condition_notes', 'documentation_link'
    ];

    for (const field of allowedFields) {
      if (data[field as keyof UpdateMovementLogDTO] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field as keyof UpdateMovementLogDTO]);
      }
    }

    if (fields.length === 0) {
      return this.getMovementLogById(id);
    }

    values.push(id);

    await pool.query<ResultSetHeader>(
      `UPDATE movement_log SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getMovementLogById(id);
  }

  // Delete movement log
  static async deleteMovementLog(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM movement_log WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  // Get movement logs by trip ID
  static async getMovementLogsByTripId(tripId: string): Promise<MovementLogWithRelations[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        ml.*,
        m.id as material_id, m.material_code, m.description, m.remarks, m.unit, m.unit_price, m.whse,
        mat_type.id as material_type_id, mat_type.type_name, mat_type.description as material_type_description,
        fl.id as from_location_id, fl.location_name as from_location_name, fl.location_type as from_location_type,
        tl.id as to_location_id, tl.location_name as to_location_name, tl.location_type as to_location_type,
        mt.id as movement_type_id, mt.name as movement_type_name,
        u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
        mto_item.id as mto_item_id, mto_item.mto_id, mto_req.mto_number, mto_item.requested_qty as mto_requested_qty, mto_item.fulfilled_qty as mto_fulfilled_qty
      FROM movement_log ml
      LEFT JOIN materials m ON ml.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      LEFT JOIN locations fl ON ml.from_location_id = fl.id
      LEFT JOIN locations tl ON ml.to_location_id = tl.id
      LEFT JOIN movement_types mt ON ml.movement_type_id = mt.id
      LEFT JOIN users u ON ml.created_by = u.id
      LEFT JOIN mto_items mto_item ON ml.mto_item_id = mto_item.id
      LEFT JOIN mto_requests mto_req ON mto_item.mto_id = mto_req.id
      WHERE ml.trip_id = ?
      ORDER BY ml.created_at DESC`,
      [tripId]
    );

    if (rows.length === 0) return [];

    return rows.map((row: any) => ({
      id: row.id,
      transaction_id: row.transaction_id,
      transaction_date: row.transaction_date,
      trip_id: row.trip_id,
      document_no: row.document_no,
      material_id: row.material_id,
      qty: row.qty,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      movement_type_id: row.movement_type_id,
      vehicle_driver: row.vehicle_driver,
      received_by: row.received_by,
      loading_time: row.loading_time,
      unloading_time: row.unloading_time,
      condition_notes: row.condition_notes,
      documentation_link: row.documentation_link,
      mto_item_id: row.mto_item_id,
      created_by: row.created_by,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        unit: row.unit,
        unit_price: row.unit_price,
        whse: row.whse,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
      from_location: row.from_location_name ? {
        id: row.from_location_id,
        location_name: row.from_location_name,
        location_type: row.from_location_type,
      } : undefined,
      to_location: row.to_location_name ? {
        id: row.to_location_id,
        location_name: row.to_location_name,
        location_type: row.to_location_type,
      } : undefined,
      movement_type: row.movement_type_name ? {
        id: row.movement_type_id,
        name: row.movement_type_name,
      } : undefined,
      created_by_user: row.created_by_name ? {
        id: row.created_by_id,
        name: row.created_by_name,
        email: row.created_by_email,
      } : undefined,
      mto_item: row.mto_item_id ? {
        id: row.mto_item_id,
        mto_id: row.mto_id,
        mto_number: row.mto_number,
        requested_qty: row.mto_requested_qty,
        fulfilled_qty: row.mto_fulfilled_qty,
      } : undefined,
    }));
  }
  // Get movement logs by document number
  static async getMovementLogsByDocumentNo(documentNo: string): Promise<MovementLogWithRelations[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        ml.*,
        m.id as material_id, m.material_code, m.description, m.remarks, m.unit, m.unit_price, m.whse,
        mat_type.id as material_type_id, mat_type.type_name, mat_type.description as material_type_description,
        fl.id as from_location_id, fl.location_name as from_location_name, fl.location_type as from_location_type,
        tl.id as to_location_id, tl.location_name as to_location_name, tl.location_type as to_location_type,
        mt.id as movement_type_id, mt.name as movement_type_name,
        u.id as created_by_id, u.name as created_by_name, u.email as created_by_email,
        mto_item.id as mto_item_id, mto_item.mto_id, mto_req.mto_number, mto_item.requested_qty as mto_requested_qty, mto_item.fulfilled_qty as mto_fulfilled_qty
      FROM movement_log ml
      LEFT JOIN materials m ON ml.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
      LEFT JOIN locations fl ON ml.from_location_id = fl.id
      LEFT JOIN locations tl ON ml.to_location_id = tl.id
      LEFT JOIN movement_types mt ON ml.movement_type_id = mt.id
      LEFT JOIN users u ON ml.created_by = u.id
      LEFT JOIN mto_items mto_item ON ml.mto_item_id = mto_item.id
      LEFT JOIN mto_requests mto_req ON mto_item.mto_id = mto_req.id
      WHERE ml.document_no = ?
      ORDER BY ml.created_at DESC`,
      [documentNo]
    );

    if (rows.length === 0) return [];

    return rows.map((row: any) => ({
      id: row.id,
      transaction_id: row.transaction_id,
      transaction_date: row.transaction_date,
      trip_id: row.trip_id,
      document_no: row.document_no,
      material_id: row.material_id,
      qty: row.qty,
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      movement_type_id: row.movement_type_id,
      vehicle_driver: row.vehicle_driver,
      received_by: row.received_by,
      loading_time: row.loading_time,
      unloading_time: row.unloading_time,
      condition_notes: row.condition_notes,
      documentation_link: row.documentation_link,
      mto_item_id: row.mto_item_id,
      created_by: row.created_by,
      created_at: row.created_at,
      material: row.material_code ? {
        id: row.material_id,
        material_code: row.material_code,
        description: row.description,
        remarks: row.remarks,
        unit: row.unit,
        unit_price: row.unit_price,
        whse: row.whse,
        material_type_id: row.material_type_id,
        material_type: row.type_name ? {
          id: row.material_type_id,
          type_name: row.type_name,
          description: row.material_type_description,
        } : undefined,
      } : undefined,
      from_location: row.from_location_name ? {
        id: row.from_location_id,
        location_name: row.from_location_name,
        location_type: row.from_location_type,
      } : undefined,
      to_location: row.to_location_name ? {
        id: row.to_location_id,
        location_name: row.to_location_name,
        location_type: row.to_location_type,
      } : undefined,
      movement_type: row.movement_type_name ? {
        id: row.movement_type_id,
        name: row.movement_type_name,
      } : undefined,
      created_by_user: row.created_by_name ? {
        id: row.created_by_id,
        name: row.created_by_name,
        email: row.created_by_email,
      } : undefined,
      mto_item: row.mto_item_id ? {
        id: row.mto_item_id,
        mto_id: row.mto_id,
        mto_number: row.mto_number,
        requested_qty: row.mto_requested_qty,
        fulfilled_qty: row.mto_fulfilled_qty,
      } : undefined,
    }));
  }

  // Get dashboard statistics
  static async getDashboardStats(): Promise<any> {
    const [todayCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM movement_log WHERE DATE(transaction_date) = CURDATE()'
    );

    const [totalCount] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM movement_log'
    );

    const [recentLogs] = await pool.query<RowDataPacket[]>(
      `SELECT ml.*, m.description, m.unit, fl.location_name as from_location_name, tl.location_name as to_location_name, mt.name as movement_type_name
       FROM movement_log ml
       LEFT JOIN materials m ON ml.material_id = m.id
      LEFT JOIN material_types mat_type ON m.material_type_id = mat_type.id
       LEFT JOIN locations fl ON ml.from_location_id = fl.id
       LEFT JOIN locations tl ON ml.to_location_id = tl.id
       LEFT JOIN movement_types mt ON ml.movement_type_id = mt.id
       ORDER BY ml.created_at DESC
       LIMIT 10`
    );

    return {
      todayCount: todayCount[0].count,
      totalCount: totalCount[0].count,
      recentLogs,
    };
  }
}
