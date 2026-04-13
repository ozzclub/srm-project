import { Request, Response } from 'express';
import { SPPService } from './spp.service';
import { SPPImportService } from './spp.import.service';
import {
  CreateSPPRequestDTO,
  UpdateSPPRequestDTO,
  CreateSPPItemDTO,
  UpdateSPPItemDTO,
  SPPQueryParams,
  ApproveSPPDTO,
  ReceiveSPPItemDTO,
} from '../../types/spp.types';

export class SPPController {
  // Get all SPP requests
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, status, date_from, date_to, requested_by } = req.query;

      const params: SPPQueryParams = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
        status: status as string | undefined,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        requested_by: requested_by as string | undefined,
      };

      const result = await SPPService.getAllSPPRequests(params);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: result.total,
          totalPages: Math.ceil(result.total / (params.limit || 10)),
        },
      });
    } catch (error) {
      console.error('Error fetching SPP requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SPP requests',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get SPP request by ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP ID',
        });
        return;
      }

      const sppRequest = await SPPService.getSPPRequestById(id);

      if (!sppRequest) {
        res.status(404).json({
          success: false,
          message: 'SPP request not found',
        });
        return;
      }

      // Get approvals
      const approvals = await SPPService.getApprovals(id);

      res.json({
        success: true,
        data: {
          ...sppRequest,
          approvals,
        },
      });
    } catch (error) {
      console.error('Error fetching SPP request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SPP request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Create SPP request
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateSPPRequestDTO = req.body;

      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'SPP request must have at least one item',
        });
        return;
      }

      if (!data.request_date || !data.requested_by) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: request_date, requested_by',
        });
        return;
      }

      const sppRequest = await SPPService.createSPPRequest(data);

      // Initialize approval workflow
      await SPPService.initializeApprovals(sppRequest.id);

      res.status(201).json({
        success: true,
        data: sppRequest,
        message: 'SPP request created successfully',
      });
    } catch (error) {
      console.error('Error creating SPP request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create SPP request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update SPP request
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateSPPRequestDTO = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP ID',
        });
        return;
      }

      const sppRequest = await SPPService.updateSPPRequest(id, data);

      if (!sppRequest) {
        res.status(404).json({
          success: false,
          message: 'SPP request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: sppRequest,
        message: 'SPP request updated successfully',
      });
    } catch (error) {
      console.error('Error updating SPP request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update SPP request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Delete SPP request
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP ID',
        });
        return;
      }

      const deleted = await SPPService.deleteSPPRequest(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'SPP request not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'SPP request deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting SPP request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete SPP request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Add item to SPP request
  static async addItem(req: Request, res: Response): Promise<void> {
    try {
      const sppId = parseInt(req.params.id);
      const data: CreateSPPItemDTO = req.body;

      if (isNaN(sppId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP ID',
        });
        return;
      }

      if (!data.description || !data.unit || !data.request_qty || !data.date_req) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: description, unit, request_qty, date_req',
        });
        return;
      }

      const item = await SPPService.addSPPItem(sppId, data);

      res.status(201).json({
        success: true,
        data: item,
        message: 'SPP item added successfully',
      });
    } catch (error) {
      console.error('Error adding SPP item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add SPP item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update SPP item
  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.itemId);
      const data: UpdateSPPItemDTO = req.body;

      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP item ID',
        });
        return;
      }

      const item = await SPPService.updateSPPItem(itemId, data);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'SPP item not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'SPP item updated successfully',
      });
    } catch (error) {
      console.error('Error updating SPP item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update SPP item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Delete SPP item
  static async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.itemId);

      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP item ID',
        });
        return;
      }

      const deleted = await SPPService.deleteSPPItem(itemId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'SPP item not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'SPP item deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting SPP item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete SPP item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get SPP fulfillment status
  static async getFulfillmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP ID',
        });
        return;
      }

      const fulfillmentStatus = await SPPService.getSPPFulfillmentStatus(id);

      if (!fulfillmentStatus) {
        res.status(404).json({
          success: false,
          message: 'SPP request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: fulfillmentStatus,
      });
    } catch (error) {
      console.error('Error fetching SPP fulfillment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SPP fulfillment status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Approve SPP request
  static async approve(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data: ApproveSPPDTO = req.body;

      // Validate authentication
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const userId = req.user.id;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP ID',
        });
        return;
      }

      if (!data.approval_role || !data.approval_status) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: approval_role, approval_status',
        });
        return;
      }

      const result = await SPPService.approveSPP(id, userId, data);

      res.json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      console.error('Error approving SPP:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve SPP',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Receive SPP item (workshop update)
  static async receiveItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.itemId);
      const data: ReceiveSPPItemDTO = req.body;

      // Validate authentication
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const userId = req.user.id;

      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid SPP item ID',
        });
        return;
      }

      if (data.receive_qty === undefined || data.receive_qty < 0) {
        res.status(400).json({
          success: false,
          message: 'receive_qty must be a positive number',
        });
        return;
      }

      const item = await SPPService.receiveSPPItem(itemId, userId, data);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'SPP item not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'SPP item received successfully',
      });
    } catch (error) {
      console.error('Error receiving SPP item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to receive SPP item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Preview Excel import (no DB writes)
  static async previewImport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const result = await SPPImportService.previewFromExcel(req.file.buffer);

      res.json({
        success: true,
        data: result,
        message: `Preview: ${result.valid_count} valid items found`,
      });
    } catch (error) {
      console.error('Error previewing SPP import:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview Excel import',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Import from Excel
  static async importFromExcel(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Parse options from request body
      const { request_date, requested_by, notes } = req.body || {};

      // Validate required fields
      if (!request_date) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: request_date',
        });
        return;
      }

      if (!requested_by) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: requested_by',
        });
        return;
      }

      const result = await SPPImportService.importFromExcel(req.file.buffer, {
        request_date,
        requested_by,
        notes,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: `Successfully imported ${result.imported_count} items`,
      });
    } catch (error) {
      console.error('Error importing SPP from Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import SPP from Excel',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Download Excel template
  static async downloadTemplate(req: Request, res: Response): Promise<void> {
    try {
      const buffer = SPPImportService.generateTemplate();

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="spp_request_template.xlsx"'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
