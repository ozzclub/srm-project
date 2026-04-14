import { pool } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
  SPPRequest,
  SPPItem,
  SPPRequestWithItems,
  CreateSPPRequestDTO,
  UpdateSPPRequestDTO,
  CreateSPPItemDTO,
  UpdateSPPItemDTO,
  SPPQueryParams,
  SPPFulfillmentStatus,
  ApproveSPPDTO,
  ReceiveSPPItemDTO,
} from '../../types/spp.types';

export class SPPService {
  // Valid status transitions
  private static readonly VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['PENDING', 'CANCELLED'],
    PENDING: ['APPROVED', 'IN_TRANSIT', 'CANCELLED'],
    APPROVED: ['IN_TRANSIT', 'CANCELLED'],
    IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
    RECEIVED: ['COMPLETED'],
    COMPLETED: [],  // Terminal state
    CANCELLED: [],  // Terminal state
  };

  // Validate status transition
  private static validateStatusTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions = this.VALID_STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions) {
      throw new Error(`Invalid current status: ${currentStatus}`);
    }
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal state)'}`
      );
    }
  }

  // Generate SPP number
  private static async generateSPPNumber(): Promise<string> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT spp_number FROM spp_requests ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return 'SPP-10000001';
    }

    const lastNumber = rows[0].spp_number.split('-')[1];
    const newNumber = parseInt(lastNumber) + 1;
    return `SPP-${String(newNumber).padStart(8, '0')}`;
  }

  // Get all SPP requests
  static async getAllSPPRequests(params: SPPQueryParams = {}): Promise<{
    data: SPPRequestWithItems[];
    total: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      date_from,
      date_to,
      requested_by,
    } = params;

    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT
        sr.id, sr.spp_number, DATE(sr.request_date) as request_date, sr.requested_by, sr.created_by_role,
        sr.status, sr.notes, sr.created_by, sr.created_at, sr.updated_at,
        COUNT(si.id) as total_items,
        SUM(CASE WHEN si.request_status = 'FULFILLED' THEN 1 ELSE 0 END) as completed_items
      FROM spp_requests sr
      LEFT JOIN spp_items si ON sr.id = si.spp_id
    `;

    let countQuery = `SELECT COUNT(DISTINCT sr.id) as total FROM spp_requests sr`;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (search) {
      conditions.push(
        '(sr.spp_number LIKE ? OR sr.requested_by LIKE ? OR sr.notes LIKE ?)'
      );
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('sr.status = ?');
      queryParams.push(status);
    }

    if (date_from) {
      conditions.push('sr.request_date >= ?');
      queryParams.push(date_from);
    }

    if (date_to) {
      conditions.push('sr.request_date <= ?');
      queryParams.push(date_to);
    }

    if (requested_by) {
      conditions.push('sr.requested_by = ?');
      queryParams.push(requested_by);
    }

    if (conditions.length > 0) {
      const whereClause = 'WHERE ' + conditions.join(' AND ');
      baseQuery += ' ' + whereClause;
      countQuery += ' ' + whereClause;
    }

    baseQuery += `
      GROUP BY sr.id
      ORDER BY sr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(countQuery, queryParams.slice(0, -2));
    const total = countRows[0].total;

    // Get data
    const [rows] = await pool.query<RowDataPacket[]>(baseQuery, queryParams);

    const data: SPPRequestWithItems[] = rows.map((row: any) => ({
      id: row.id,
      spp_number: row.spp_number,
      request_date: row.request_date,
      requested_by: row.requested_by,
      created_by_role: row.created_by_role,
      status: row.status,
      notes: row.notes,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_items: parseInt(row.total_items) || 0,
      completed_items: parseInt(row.completed_items) || 0,
      fulfillment_percentage:
        parseInt(row.total_items) > 0
          ? (parseInt(row.completed_items) / parseInt(row.total_items)) * 100
          : 0,
      items: [],
    }));

    return { data, total };
  }

  // Get SPP request by ID with items
  static async getSPPRequestById(id: number): Promise<SPPRequestWithItems | null> {
    // Get SPP request
    const [sppRows] = await pool.query<RowDataPacket[]>(
      `SELECT
        id, spp_number, DATE(request_date) as request_date, requested_by, created_by_role, status, notes, created_by, created_at, updated_at
      FROM spp_requests WHERE id = ?`,
      [id]
    );

    if (sppRows.length === 0) return null;

    const sppRequest: SPPRequest = sppRows[0] as SPPRequest;

    // Get items with material info
    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT
        si.id, si.spp_id, si.material_id, si.list_item_number, si.list_item,
        si.description, si.remarks, si.unit, si.request_qty, si.receive_qty,
        si.remaining_qty, si.request_status, DATE(si.date_req) as date_req,
        si.item_type, si.item_status, si.delivery_status, si.verified_by, si.verified_at, si.rejection_reason, si.created_at,
        m.id as material_id,
        m.material_code,
        m.description as material_description,
        m.remarks as material_remarks,
        m.material_type_id,
        mt.type_name as material_type_name,
        mt.description as material_type_description
      FROM spp_items si
      LEFT JOIN materials m ON si.material_id = m.id
      LEFT JOIN material_types mt ON m.material_type_id = mt.id
      WHERE si.spp_id = ?
      ORDER BY si.list_item_number`,
      [id]
    );

    console.log(`[SPP Get] spp_id=${id}, request_date=${sppRows[0].request_date}, items_count=${itemRows.length}`);

    const items: SPPItem[] = itemRows.map((row: any) => ({
      id: row.id,
      spp_id: row.spp_id,
      material_id: row.material_id,
      list_item_number: row.list_item_number,
      list_item: row.list_item,
      description: row.description,
      remarks: row.remarks,
      unit: row.unit,
      request_qty: parseFloat(row.request_qty),
      receive_qty: parseFloat(row.receive_qty),
      remaining_qty: parseFloat(row.remaining_qty),
      request_status: row.request_status,
      date_req: row.date_req,
      item_type: row.item_type || 'MATERIAL',
      item_status: row.item_status,
      delivery_status: row.delivery_status || 'NOT_SENT',
      verified_by: row.verified_by,
      verified_at: row.verified_at,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      material: row.material_id
        ? {
            id: row.material_id,
            material_code: row.material_code,
            description: row.material_description,
            remarks: row.material_remarks,
            material_type_id: row.material_type_id,
            material_type: row.material_type_id
              ? {
                  id: row.material_type_id,
                  type_name: row.material_type_name,
                  description: row.material_type_description,
                }
              : undefined,
          }
        : undefined,
    }));

    const total_items = items.length;
    const completed_items = items.filter((item) => item.request_status === 'FULFILLED').length;
    const fulfillment_percentage = total_items > 0 ? (completed_items / total_items) * 100 : 0;

    return {
      ...sppRequest,
      items,
      total_items,
      completed_items,
      fulfillment_percentage,
    };
  }

  // Create SPP request
  static async createSPPRequest(data: CreateSPPRequestDTO): Promise<SPPRequestWithItems> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate SPP number
      const spp_number = data.spp_number || (await this.generateSPPNumber());

      // Create SPP request
      const sql1 = 'INSERT INTO spp_requests (spp_number, request_date, requested_by, created_by_role, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const values1 = [
        spp_number,
        data.request_date,
        data.requested_by,
        data.created_by_role || 'site', // Default to 'site' as per new workflow
        'DRAFT',
        data.notes || null,
        data.created_by || null,
      ];
      console.log(`[SPP Create] SQL:`, sql1);
      console.log(`[SPP Create] Values (${values1.length}):`, JSON.stringify(values1));
      const [result] = await connection.query<ResultSetHeader>(sql1, values1);

      const sppId = result.insertId;

      // Create items
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const sql = 'INSERT INTO spp_items (spp_id, material_id, list_item_number, list_item, description, remarks, unit, request_qty, date_req, delivery_status, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          const values = [
            sppId,
            item.material_id || null,
            item.list_item_number || (i + 1),
            item.list_item,
            item.description,
            (item as any).remarks || null,
            item.unit,
            item.request_qty,
            item.date_req,
            'NOT_SENT', // Initial delivery status
            item.item_type || 'MATERIAL', // Item type (TOOL or MATERIAL)
          ];
          console.log(`[SPP Create Item] spp_id=${sppId}, item=${i+1}, item_type=${item.item_type}`, JSON.stringify(values));
          await connection.query(sql, values);
        }
      }

      console.log(`[SPP Create] spp_id=${sppId}, request_date=${data.request_date}, items_count=${data.items?.length}`);

      await connection.commit();

      const result_data = await this.getSPPRequestById(sppId);
      if (!result_data) throw new Error('Failed to retrieve created SPP request');

      return result_data;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update SPP request
  static async updateSPPRequest(
    id: number,
    data: UpdateSPPRequestDTO
  ): Promise<SPPRequestWithItems | null> {
    // If status is being updated, validate transition
    if (data.status) {
      const [currentRows] = await pool.query<RowDataPacket[]>(
        'SELECT status FROM spp_requests WHERE id = ?',
        [id]
      );
      
      if (currentRows.length === 0) {
        return null;
      }
      
      const currentStatus = currentRows[0].status;
      this.validateStatusTransition(currentStatus, data.status);
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.request_date) {
      fields.push('request_date = ?');
      values.push(data.request_date);
    }
    if (data.requested_by) {
      fields.push('requested_by = ?');
      values.push(data.requested_by);
    }
    if (data.status) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.getSPPRequestById(id);
    }

    values.push(id);

    await pool.query(
      `UPDATE spp_requests SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getSPPRequestById(id);
  }

  // Delete SPP request
  static async deleteSPPRequest(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM spp_requests WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Add item to SPP request
  static async addSPPItem(
    sppId: number,
    data: CreateSPPItemDTO
  ): Promise<SPPItem> {
    // Get max list_item_number
    const [maxRows] = await pool.query<RowDataPacket[]>(
      'SELECT MAX(list_item_number) as max_num FROM spp_items WHERE spp_id = ?',
      [sppId]
    );

    const listItemNumber = data.list_item_number || (maxRows[0]?.max_num || 0) + 1;

    await pool.query(
      'INSERT INTO spp_items (spp_id, material_id, list_item_number, list_item, description, remarks, unit, request_qty, date_req, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sppId,
        data.material_id || null,
        listItemNumber,
        data.list_item,
        data.description,
        data.remarks || null,
        data.unit,
        data.request_qty,
        data.date_req,
        data.item_type || 'MATERIAL',
      ]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM spp_items WHERE spp_id = ? ORDER BY list_item_number',
      [sppId]
    );

    return rows[rows.length - 1] as SPPItem;
  }

  // Update SPP item
  static async updateSPPItem(
    itemId: number,
    data: UpdateSPPItemDTO
  ): Promise<SPPItem | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.material_id !== undefined) {
      fields.push('material_id = ?');
      values.push(data.material_id);
    }
    if (data.list_item !== undefined) {
      fields.push('list_item = ?');
      values.push(data.list_item);
    }
    if (data.description) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.remarks !== undefined) {
      fields.push('remarks = ?');
      values.push(data.remarks || null);
    }
    if (data.unit) {
      fields.push('unit = ?');
      values.push(data.unit);
    }
    if (data.request_qty !== undefined) {
      fields.push('request_qty = ?');
      values.push(data.request_qty);
    }
    if (data.receive_qty !== undefined) {
      fields.push('receive_qty = ?');
      values.push(data.receive_qty);
    }
    if (data.date_req) {
      fields.push('date_req = ?');
      values.push(data.date_req);
    }
    if (data.item_type) {
      fields.push('item_type = ?');
      values.push(data.item_type);
    }
    if (data.item_status) {
      fields.push('item_status = ?');
      values.push(data.item_status);
    }

    if (fields.length === 0) {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM spp_items WHERE id = ?',
        [itemId]
      );
      return (rows[0] as SPPItem) || null;
    }

    values.push(itemId);

    await pool.query(
      `UPDATE spp_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Update request_status based on receive_qty
    const [itemRows] = await pool.query<RowDataPacket[]>(
      'SELECT request_qty, receive_qty FROM spp_items WHERE id = ?',
      [itemId]
    );

    if (itemRows.length > 0) {
      const item = itemRows[0];
      let request_status = 'PENDING';
      if (parseFloat(item.receive_qty) >= parseFloat(item.request_qty)) {
        request_status = 'FULFILLED';
      } else if (parseFloat(item.receive_qty) > 0) {
        request_status = 'PARTIAL';
      }

      await pool.query('UPDATE spp_items SET request_status = ? WHERE id = ?', [
        request_status,
        itemId,
      ]);
    }

    // Cascade updates to inventory if item has been received
    if (data.receive_qty !== undefined || data.item_type !== undefined) {
      // Check if inventory exists for this item
      const [invRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM inventory WHERE spp_item_id = ?',
        [itemId]
      );

      if (invRows.length > 0) {
        const invUpdates: string[] = [];
        const invValues: any[] = [];

        // Cascade receive_qty to inventory.quantity
        if (data.receive_qty !== undefined) {
          invUpdates.push('quantity = ?');
          invValues.push(data.receive_qty);
        }

        // Cascade item_type to inventory.item_type
        if (data.item_type !== undefined) {
          invUpdates.push('item_type = ?');
          invValues.push(data.item_type);
        }

        if (invUpdates.length > 0) {
          invValues.push(itemId);
          await pool.query(
            `UPDATE inventory SET ${invUpdates.join(', ')} WHERE spp_item_id = ?`,
            invValues
          );
        }
      }
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM spp_items WHERE id = ?',
      [itemId]
    );

    return rows[0] as SPPItem || null;
  }

  // Delete SPP item
  static async deleteSPPItem(itemId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM spp_items WHERE id = ?',
      [itemId]
    );
    return result.affectedRows > 0;
  }

  // Get SPP fulfillment status
  static async getSPPFulfillmentStatus(id: number): Promise<SPPFulfillmentStatus | null> {
    const [sppRows] = await pool.query<RowDataPacket[]>(
      'SELECT spp_number FROM spp_requests WHERE id = ?',
      [id]
    );

    if (sppRows.length === 0) return null;

    const [itemRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id,
        material_id,
        description,
        request_qty,
        receive_qty,
        remaining_qty,
        unit,
        request_status
      FROM spp_items
      WHERE spp_id = ?
      ORDER BY list_item_number`,
      [id]
    );

    const total_requested = itemRows.reduce(
      (sum: number, item: any) => sum + parseFloat(item.request_qty),
      0
    );
    const total_received = itemRows.reduce(
      (sum: number, item: any) => sum + parseFloat(item.receive_qty),
      0
    );
    const fulfillment_percentage =
      total_requested > 0 ? (total_received / total_requested) * 100 : 0;

    return {
      spp_id: id,
      spp_number: sppRows[0].spp_number,
      total_requested,
      total_received,
      fulfillment_percentage,
      items: itemRows.map((item: any) => ({
        item_id: item.id,
        material_id: item.material_id,
        description: item.description,
        request_qty: parseFloat(item.request_qty),
        receive_qty: parseFloat(item.receive_qty),
        remaining_qty: parseFloat(item.remaining_qty),
        unit: item.unit,
        request_status: item.request_status,
      })),
    };
  }

  // Approve SPP request
  static async approveSPP(
    sppId: number,
    userId: number,
    data: ApproveSPPDTO
  ): Promise<any> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if approval already exists
      const [existingApproval] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM spp_approvals WHERE spp_id = ? AND approval_role = ? AND approval_status = ?',
        [sppId, data.approval_role, 'PENDING']
      );

      // If no pending approval exists, create one first
      if (existingApproval.length === 0) {
        console.log(`No pending approval found for role ${data.approval_role}, creating one...`);
        await connection.query(
          'INSERT INTO spp_approvals (spp_id, approved_by, approval_role, approval_status) VALUES (?, ?, ?, ?)',
          [sppId, userId, data.approval_role, 'PENDING']
        );
      }

      // Update approval
      await connection.query(
        'UPDATE spp_approvals SET approval_status = ?, approval_notes = ?, approved_at = NOW(), approved_by = ? WHERE spp_id = ? AND approval_role = ? AND approval_status = ?',
        [
          data.approval_status,
          data.approval_notes || null,
          userId,
          sppId,
          data.approval_role,
          'PENDING',
        ]
      );

      // If approved by material_site, create inventory and update status
      if (data.approval_status === 'APPROVED' && data.approval_role === 'material_site') {
        await this.createInventoryFromSPP(connection, sppId, userId);

        // Update SPP status to COMPLETED
        await connection.query(
          'UPDATE spp_requests SET status = ? WHERE id = ?',
          ['COMPLETED', sppId]
        );
      }

      // If approved by site, update items delivery status
      if (data.approval_status === 'APPROVED' && data.approval_role === 'site') {
        // Update all items status to RECEIVED if they have receive_qty
        await connection.query(
          'UPDATE spp_items SET item_status = CASE WHEN receive_qty > 0 THEN ? ELSE item_status END WHERE spp_id = ?',
          ['RECEIVED', sppId]
        );
      }

      await connection.commit();

      return {
        success: true,
        message: `SPP ${data.approval_status.toLowerCase()} by ${data.approval_role}`,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Receive SPP items (workshop update)
  static async receiveSPPItem(
    itemId: number,
    userId: number,
    data: ReceiveSPPItemDTO
  ): Promise<SPPItem | null> {
    const item = await this.updateSPPItem(itemId, {
      receive_qty: data.receive_qty,
      item_status: data.item_status || 'IN_TRANSIT',
    });

    return item;
  }

  // Create inventory from SPP (called after material_site approval)
  private static async createInventoryFromSPP(
    connection: any,
    sppId: number,
    userId: number
  ): Promise<void> {
    // Get SPP request
    const [sppRows] = await connection.query(
      'SELECT spp_number FROM spp_requests WHERE id = ?',
      [sppId]
    ) as [RowDataPacket[], any];

    if (sppRows.length === 0) {
      throw new Error('SPP request not found');
    }

    const sppNumber = (sppRows[0] as any).spp_number;

    // Get all items with receive_qty > 0
    const [itemRows] = await connection.query(
      'SELECT * FROM spp_items WHERE spp_id = ? AND receive_qty > 0',
      [sppId]
    ) as [RowDataPacket[], any];

    for (const item of itemRows) {
      // Use explicit item_type from spp_items table (set when item was created)
      const item_type: 'TOOL' | 'MATERIAL' = item.item_type || 'MATERIAL';

      // Check if inventory already exists for this item
      const [existingInv] = await connection.query(
        'SELECT id FROM inventory WHERE spp_item_id = ?',
        [item.id]
      ) as [RowDataPacket[], any];

      if (existingInv.length > 0) {
        // Update existing inventory
        await connection.query(
          'UPDATE inventory SET quantity = ? WHERE spp_item_id = ?',
          [item.receive_qty, item.id]
        );
      } else {
        // Create new inventory record
        await connection.query(
          'INSERT INTO inventory (spp_item_id, material_id, item_type, quantity, received_from_spp) VALUES (?, ?, ?, ?, ?)',
          [
            item.id,
            item.material_id || null,
            item_type,
            item.receive_qty,
            sppNumber,
          ]
        );
      }
    }
  }

  // Initialize approval for SPP
  static async initializeApprovals(sppId: number): Promise<void> {
    // Check if approvals already exist
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM spp_approvals WHERE spp_id = ?',
      [sppId]
    );

    if (existing.length > 0) return;

    // Create site approval (first tier - receives the request)
    await pool.query(
      'INSERT INTO spp_approvals (spp_id, approved_by, approval_role, approval_status) VALUES (?, NULL, ?, ?)',
      [sppId, 'site', 'PENDING']
    );

    // Create workshop approval (second tier - fulfills the request)
    await pool.query(
      'INSERT INTO spp_approvals (spp_id, approved_by, approval_role, approval_status) VALUES (?, NULL, ?, ?)',
      [sppId, 'workshop', 'PENDING']
    );

    // Create material_site approval (third tier - final approval)
    await pool.query(
      'INSERT INTO spp_approvals (spp_id, approved_by, approval_role, approval_status) VALUES (?, NULL, ?, ?)',
      [sppId, 'material_site', 'PENDING']
    );
  }

  // Get approvals for SPP
  static async getApprovals(sppId: number): Promise<any[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        sa.*,
        u.name as approved_by_name
      FROM spp_approvals sa
      LEFT JOIN users u ON sa.approved_by = u.id
      WHERE sa.spp_id = ?
      ORDER BY sa.created_at`,
      [sppId]
    );

    return rows;
  }

  // SITE approval - Site confirms receipt of goods
  static async approveBySite(
    sppId: number,
    userId: number,
    data: {
      approval_status: 'APPROVED' | 'REJECTED';
      approval_notes?: string;
      items?: { item_id: number; receive_qty: number }[];
    }
  ): Promise<any> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update or create site approval
      const [existingApproval] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM spp_approvals WHERE spp_id = ? AND approval_role = ? AND approval_status = ?',
        [sppId, 'site', 'PENDING']
      );

      if (existingApproval.length === 0) {
        await connection.query(
          'INSERT INTO spp_approvals (spp_id, approved_by, approval_role, approval_status) VALUES (?, ?, ?, ?)',
          [sppId, userId, 'site', 'PENDING']
        );
      }

      await connection.query(
        'UPDATE spp_approvals SET approval_status = ?, approval_notes = ?, approved_at = NOW(), approved_by = ? WHERE spp_id = ? AND approval_role = ? AND approval_status = ?',
        [
          data.approval_status,
          data.approval_notes || null,
          userId,
          sppId,
          'site',
          'PENDING',
        ]
      );

      // If approved, update items receive_qty and create inventory
      if (data.approval_status === 'APPROVED' && data.items && data.items.length > 0) {
        // Update each item's receive_qty and delivery_status
        for (const itemData of data.items) {
          const [itemRows] = await connection.query<RowDataPacket[]>(
            'SELECT request_qty, receive_qty FROM spp_items WHERE id = ?',
            [itemData.item_id]
          );

          if (itemRows.length > 0) {
            const currentReceive = parseFloat(itemRows[0].receive_qty);
            const newReceive = currentReceive + itemData.receive_qty;
            const requestQty = parseFloat(itemRows[0].request_qty);

            // Determine delivery_status
            let deliveryStatus = 'NOT_SENT';
            if (newReceive > 0 && newReceive < requestQty) {
              deliveryStatus = 'PARTIAL';
            } else if (newReceive >= requestQty) {
              deliveryStatus = 'SENT';
            }

            // Determine item_status
            let itemStatus = 'IN_TRANSIT';
            if (newReceive >= requestQty) {
              itemStatus = 'RECEIVED';
            }

            await connection.query(
              'UPDATE spp_items SET receive_qty = ?, delivery_status = ?, item_status = ? WHERE id = ?',
              [newReceive, deliveryStatus, itemStatus, itemData.item_id]
            );

            // Update request_status
            let requestStatus = 'PENDING';
            if (newReceive >= requestQty) {
              requestStatus = 'FULFILLED';
            } else if (newReceive > 0) {
              requestStatus = 'PARTIAL';
            }

            await connection.query(
              'UPDATE spp_items SET request_status = ? WHERE id = ?',
              [requestStatus, itemData.item_id]
            );
          }
        }

        // Create inventory for received items
        await this.createInventoryFromSPP(connection, sppId, userId);

        // Update SPP status based on fulfillment
        await this.updateSPPStatusBasedOnFulfillment(connection, sppId);
      }

      await connection.commit();

      return {
        success: true,
        message: `SPP ${data.approval_status.toLowerCase()} by site`,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update delivery status for individual item (Workshop update)
  static async updateItemDelivery(
    itemId: number,
    userId: number,
    data: {
      receive_qty?: number;
      delivery_status?: 'NOT_SENT' | 'SENT';
      item_status?: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION';
    }
  ): Promise<SPPItem | null> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get current item data
      const [itemRows] = await connection.query<RowDataPacket[]>(
        'SELECT spp_id, request_qty, receive_qty FROM spp_items WHERE id = ?',
        [itemId]
      );

      if (itemRows.length === 0) {
        return null;
      }

      const currentItem = itemRows[0];
      const sppId = currentItem.spp_id;
      const requestQty = parseFloat(currentItem.request_qty);
      const newReceive = data.receive_qty !== undefined ? data.receive_qty : parseFloat(currentItem.receive_qty);

      // Workshop sends items → Mark as PENDING_VERIFICATION (not RECEIVED yet)
      // Inventory will be created only after SITE verification
      const deliveryStatus = data.delivery_status || (newReceive > 0 ? 'SENT' : 'NOT_SENT');
      const itemStatus = 'PENDING_VERIFICATION'; // Requires SITE verification

      // Update item
      await connection.query(
        'UPDATE spp_items SET receive_qty = ?, delivery_status = ?, item_status = ? WHERE id = ?',
        [newReceive, deliveryStatus, itemStatus, itemId]
      );

      // Update request_status
      let requestStatus = 'PENDING';
      if (newReceive >= requestQty) {
        requestStatus = 'FULFILLED';
      } else if (newReceive > 0) {
        requestStatus = 'PARTIAL';
      }

      await connection.query(
        'UPDATE spp_items SET request_status = ? WHERE id = ?',
        [requestStatus, itemId]
      );

      // NOTE: NO inventory creation yet! Wait for SITE verification.

      // Update SPP status - Force to IN_TRANSIT when workshop delivers
      // DO NOT allow completion until SITE verifies
      await connection.query(
        'UPDATE spp_requests SET status = ? WHERE id = ?',
        ['IN_TRANSIT', sppId]
      );

      await connection.commit();

      // Return updated item
      const [updatedRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM spp_items WHERE id = ?',
        [itemId]
      );

      return updatedRows[0] as SPPItem;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // SITE verifies delivery from Workshop
  static async verifyDeliveryBySite(
    itemId: number,
    userId: number,
    data: {
      action: 'VERIFY' | 'REJECT' | 'ADJUST';
      actual_qty?: number;
      rejection_reason?: string;
      notes?: string;
    }
  ): Promise<SPPItem | null> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get current item
      const [itemRows] = await connection.query(
        'SELECT spp_id, request_qty, receive_qty, delivery_status FROM spp_items WHERE id = ?',
        [itemId]
      ) as [RowDataPacket[], any];

      if (itemRows.length === 0) {
        return null;
      }

      const currentItem = itemRows[0];
      const sppId = currentItem.spp_id;
      const requestQty = parseFloat(currentItem.request_qty);
      const currentReceive = parseFloat(currentItem.receive_qty);

      let newReceive = currentReceive;
      let newDeliveryStatus: string = '';
      let newItemStatus: string = '';
      let rejectionReason: string | null = null;

      if (data.action === 'VERIFY') {
        // SITE confirms what Workshop sent
        newDeliveryStatus = 'VERIFIED';
        newItemStatus = 'RECEIVED';
        // Keep current receive_qty (Workshop's qty)

        // Create inventory
        await this.createInventoryFromSPPItem(connection, itemId, sppId);

      } else if (data.action === 'ADJUST') {
        // SITE adjusts qty (different from Workshop)
        if (data.actual_qty === undefined) {
          throw new Error('actual_qty is required for ADJUST action');
        }
        newReceive = data.actual_qty;
        newDeliveryStatus = 'VERIFIED';
        newItemStatus = 'RECEIVED';

        // Update receive_qty
        await connection.query(
          'UPDATE spp_items SET receive_qty = ? WHERE id = ?',
          [newReceive, itemId]
        );

        // Create inventory with adjusted qty
        await this.createInventoryFromSPPItem(connection, itemId, sppId);

      } else if (data.action === 'REJECT') {
        // SITE rejects - item goes back to Workshop
        if (!data.rejection_reason) {
          throw new Error('rejection_reason is required for REJECT action');
        }
        newReceive = 0;
        newDeliveryStatus = 'REJECTED';
        newItemStatus = 'PENDING';
        rejectionReason = data.rejection_reason;

        // Reset receive_qty
        await connection.query(
          'UPDATE spp_items SET receive_qty = ? WHERE id = ?',
          [0, itemId]
        );
      } else {
        throw new Error(`Invalid action: ${data.action}`);
      }

      // Update verification fields
      await connection.query(
        'UPDATE spp_items SET delivery_status = ?, item_status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ? WHERE id = ?',
        [newDeliveryStatus, newItemStatus, userId, rejectionReason, itemId]
      );

      // Update request_status
      let requestStatus = 'PENDING';
      if (newReceive >= requestQty) {
        requestStatus = 'FULFILLED';
      } else if (newReceive > 0) {
        requestStatus = 'PARTIAL';
      }

      await connection.query(
        'UPDATE spp_items SET request_status = ? WHERE id = ?',
        [requestStatus, itemId]
      );

      // Update SPP overall status
      await this.updateSPPStatusBasedOnFulfillment(connection, sppId);

      await connection.commit();

      // Return updated item
      const [updatedRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM spp_items WHERE id = ?',
        [itemId]
      );
      return updatedRows[0] as SPPItem;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // SITE directly receives items (no Workshop update needed)
  static async directReceiveBySite(
    itemId: number,
    userId: number,
    data: {
      receive_qty: number;
      notes?: string;
    }
  ): Promise<SPPItem | null> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get current item
      const [itemRows] = await connection.query(
        'SELECT spp_id, request_qty FROM spp_items WHERE id = ?',
        [itemId]
      ) as [RowDataPacket[], any];

      if (itemRows.length === 0) {
        return null;
      }

      const currentItem = itemRows[0];
      const sppId = currentItem.spp_id;
      const requestQty = parseFloat(currentItem.request_qty);

      // SITE directly receives - no verification needed (SITE is the authority)
      const newReceive = data.receive_qty;

      // Update item - Skip PENDING_VERIFICATION, go straight to RECEIVED
      await connection.query(
        'UPDATE spp_items SET receive_qty = ?, delivery_status = ?, item_status = ?, verified_by = ?, verified_at = NOW() WHERE id = ?',
        [newReceive, 'VERIFIED', 'RECEIVED', userId, itemId]
      );

      // Update request_status
      let requestStatus = 'PENDING';
      if (newReceive >= requestQty) {
        requestStatus = 'FULFILLED';
      } else if (newReceive > 0) {
        requestStatus = 'PARTIAL';
      }

      await connection.query(
        'UPDATE spp_items SET request_status = ? WHERE id = ?',
        [requestStatus, itemId]
      );

      // Create inventory immediately (SITE already confirmed)
      if (newReceive > 0) {
        await this.createInventoryFromSPPItem(connection, itemId, sppId);
      }

      // Update SPP overall status
      await this.updateSPPStatusBasedOnFulfillment(connection, sppId);

      await connection.commit();

      // Return updated item
      const [updatedRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM spp_items WHERE id = ?',
        [itemId]
      );
      return updatedRows[0] as SPPItem;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // SITE updates item type (TOOL or MATERIAL) - to fix Workshop mistakes
  static async updateItemType(
    itemId: number,
    userId: number,
    item_type: 'TOOL' | 'MATERIAL'
  ): Promise<SPPItem | null> {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get current item
      const [itemRows] = await connection.query(
        'SELECT spp_id, item_type FROM spp_items WHERE id = ?',
        [itemId]
      ) as [RowDataPacket[], any];

      if (itemRows.length === 0) {
        return null;
      }

      const currentItem = itemRows[0];
      const sppId = currentItem.spp_id;
      const oldItemType = currentItem.item_type;

      // Update item_type in spp_items
      await connection.query(
        'UPDATE spp_items SET item_type = ? WHERE id = ?',
        [item_type, itemId]
      );

      // Also update inventory if it exists
      await connection.query(
        'UPDATE inventory SET item_type = ? WHERE spp_item_id = ?',
        [item_type, itemId]
      );

      await connection.commit();

      // Return updated item
      const [updatedRows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM spp_items WHERE id = ?',
        [itemId]
      );
      return updatedRows[0] as SPPItem;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Create inventory from a single SPP item
  private static async createInventoryFromSPPItem(
    connection: any,
    itemId: number,
    sppId: number
  ): Promise<void> {
    // Get SPP number
    const [sppRows] = await connection.query(
      'SELECT spp_number FROM spp_requests WHERE id = ?',
      [sppId]
    ) as [RowDataPacket[], any];

    if (sppRows.length === 0) {
      throw new Error('SPP request not found');
    }

    const sppNumber = (sppRows[0] as any).spp_number;

    // Get item
    const [itemRows] = await connection.query(
      'SELECT * FROM spp_items WHERE id = ? AND receive_qty > 0',
      [itemId]
    ) as [RowDataPacket[], any];

    if (itemRows.length === 0) return;

    const item = itemRows[0];

    // Use explicit item_type from spp_items table (set when item was created)
    const item_type: 'TOOL' | 'MATERIAL' = item.item_type || 'MATERIAL';

    // Check if inventory already exists for this item
    const [existingInv] = await connection.query(
      'SELECT id FROM inventory WHERE spp_item_id = ?',
      [itemId]
    ) as [RowDataPacket[], any];

    if (existingInv.length > 0) {
      // Update existing inventory
      await connection.query(
        'UPDATE inventory SET quantity = ? WHERE spp_item_id = ?',
        [item.receive_qty, itemId]
      );
    } else {
      // Create new inventory record
      await connection.query(
        'INSERT INTO inventory (spp_item_id, material_id, item_type, quantity, received_from_spp) VALUES (?, ?, ?, ?, ?)',
        [
          itemId,
          item.material_id || null,
          item_type,
          item.receive_qty,
          sppNumber,
        ]
      );
    }
  }

  // Update SPP status based on fulfillment progress
  private static async updateSPPStatusBasedOnFulfillment(
    connection: any,
    sppId: number
  ): Promise<void> {
    // Get all items for this SPP with item_status (verification state)
    const [itemRows] = await connection.query(
      'SELECT item_status, delivery_status FROM spp_items WHERE spp_id = ?',
      [sppId]
    ) as [RowDataPacket[], any];

    if (itemRows.length === 0) return;

    const totalItems = itemRows.length;
    
    // Count items by verification state and fulfillment
    const verifiedItems = itemRows.filter((item: any) => 
      item.item_status === 'RECEIVED'  // SITE verified
    ).length;

    const fullyFulfilledItems = itemRows.filter((item: any) => 
      parseFloat(item.receive_qty) >= parseFloat(item.request_qty)
    ).length;
    
    const pendingVerificationItems = itemRows.filter((item: any) => 
      item.item_status === 'PENDING_VERIFICATION'  // Workshop sent, waiting SITE
    ).length;
    
    const rejectedItems = itemRows.filter((item: any) => 
      item.delivery_status === 'REJECTED'  // SITE rejected
    ).length;

    // Determine new status based on actual verification state and fulfillment
    let newStatus = 'PENDING';

    if (verifiedItems === totalItems && fullyFulfilledItems === totalItems) {
      // ALL items SITE-verified AND 100% Fulfilled → COMPLETED
      newStatus = 'COMPLETED';
    } else if (pendingVerificationItems > 0 || verifiedItems > 0) {
      // Some items sent/verified but not yet 100% total fulfillment → IN_TRANSIT
      newStatus = 'IN_TRANSIT';
    } else if (rejectedItems > 0) {
      // Items rejected → back to PENDING
      newStatus = 'PENDING';
    }

    // Update SPP status
    await connection.query(
      'UPDATE spp_requests SET status = ? WHERE id = ?',
      [newStatus, sppId]
    );
  }
}
