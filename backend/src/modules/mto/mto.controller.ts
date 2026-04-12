import { Request, Response } from 'express';
import { MTOService } from './mto.service';
import { CreateMTORequestDTO, UpdateMTORequestDTO, CreateMTOItemDTO, UpdateMTOItemDTO } from '../../types/mto.types';

export class MTOController {
  // Get all MTO requests
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, status, date_from, date_to, project_name } = req.query;

      const params = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
        status: status as string | undefined,
        date_from: date_from as string | undefined,
        date_to: date_to as string | undefined,
        project_name: project_name as string | undefined,
      };

      const result = await MTOService.getAllMTORequests(params);

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
      console.error('Error fetching MTO requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch MTO requests',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get MTO request by ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO ID',
        });
        return;
      }

      const mtoRequest = await MTOService.getMTORequestById(id);

      if (!mtoRequest) {
        res.status(404).json({
          success: false,
          message: 'MTO request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: mtoRequest,
      });
    } catch (error) {
      console.error('Error fetching MTO request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch MTO request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Create MTO request
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateMTORequestDTO = req.body;

      // Validate items array
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'MTO request must have at least one item',
        });
        return;
      }

      // Validate required fields
      if (!data.project_name || !data.request_date || !data.requested_by) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: project_name, request_date, requested_by',
        });
        return;
      }

      const mtoRequest = await MTOService.createMTORequest(data);

      res.status(201).json({
        success: true,
        data: mtoRequest,
        message: 'MTO request created successfully',
      });
    } catch (error) {
      console.error('Error creating MTO request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create MTO request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update MTO request
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateMTORequestDTO = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO ID',
        });
        return;
      }

      const mtoRequest = await MTOService.updateMTORequest(id, data);

      if (!mtoRequest) {
        res.status(404).json({
          success: false,
          message: 'MTO request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: mtoRequest,
        message: 'MTO request updated successfully',
      });
    } catch (error) {
      console.error('Error updating MTO request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update MTO request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Delete MTO request
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO ID',
        });
        return;
      }

      const deleted = await MTOService.deleteMTORequest(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'MTO request not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'MTO request deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting MTO request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete MTO request',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Add item to MTO request
  static async addItem(req: Request, res: Response): Promise<void> {
    try {
      const mtoId = parseInt(req.params.id);
      const data: CreateMTOItemDTO = req.body;

      if (isNaN(mtoId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO ID',
        });
        return;
      }

      if (!data.material_id || !data.requested_qty) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: material_id, requested_qty',
        });
        return;
      }

      const item = await MTOService.addMTOItem(mtoId, data);

      res.status(201).json({
        success: true,
        data: item,
        message: 'MTO item added successfully',
      });
    } catch (error) {
      console.error('Error adding MTO item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add MTO item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update MTO item
  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.itemId);
      const data: UpdateMTOItemDTO = req.body;

      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO item ID',
        });
        return;
      }

      const item = await MTOService.updateMTOItem(itemId, data);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'MTO item not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'MTO item updated successfully',
      });
    } catch (error) {
      console.error('Error updating MTO item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update MTO item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Delete MTO item
  static async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = parseInt(req.params.itemId);

      if (isNaN(itemId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO item ID',
        });
        return;
      }

      const deleted = await MTOService.deleteMTOItem(itemId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'MTO item not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'MTO item deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting MTO item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete MTO item',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get MTO fulfillment status
  static async getFulfillmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const mtoId = parseInt(req.params.id);

      if (isNaN(mtoId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO ID',
        });
        return;
      }

      const fulfillmentStatus = await MTOService.getMTOFulfillmentStatus(mtoId);

      if (!fulfillmentStatus) {
        res.status(404).json({
          success: false,
          message: 'MTO request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: fulfillmentStatus,
      });
    } catch (error) {
      console.error('Error fetching MTO fulfillment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch MTO fulfillment status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update MTO status (approve, complete, cancel)
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid MTO ID',
        });
        return;
      }

      const validStatuses = ['DRAFT', 'APPROVED', 'PARTIAL', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: DRAFT, APPROVED, PARTIAL, COMPLETED, CANCELLED',
        });
        return;
      }

      const mtoRequest = await MTOService.updateMTORequest(id, { status });

      if (!mtoRequest) {
        res.status(404).json({
          success: false,
          message: 'MTO request not found',
        });
        return;
      }

      res.json({
        success: true,
        data: mtoRequest,
        message: `MTO status updated to ${status}`,
      });
    } catch (error) {
      console.error('Error updating MTO status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update MTO status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
