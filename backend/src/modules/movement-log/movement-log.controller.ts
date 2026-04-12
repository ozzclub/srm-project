import { Request, Response } from 'express';
import { MovementLogService } from './movement-log.service';
import { ApiResponse } from '../../types/api.types';

export class MovementLogController {
  // Get all movement logs
  static async getAllMovementLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, date_from, date_to, material_id, movement_type_id, location_id } = req.query;
      
      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
        search: search as string,
        date_from: date_from as string,
        date_to: date_to as string,
        material_id: material_id ? parseInt(material_id as string) : undefined,
        movement_type_id: movement_type_id ? parseInt(movement_type_id as string) : undefined,
        location_id: location_id ? parseInt(location_id as string) : undefined,
      };

      const { data, total } = await MovementLogService.getAllMovementLogs(params);
      
      const totalPages = Math.ceil(total / params.limit);
      
      res.status(200).json({
        success: true,
        message: 'Movement logs retrieved successfully',
        data,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
          hasNext: params.page < totalPages,
          hasPrev: params.page > 1,
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Get movement logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get movement log by transaction_id
  static async getMovementLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Only accept transaction_id format (non-numeric strings)
      if (/^\d+$/.test(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameter. Please use transaction_id instead of numeric ID.',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const movementLog = await MovementLogService.getMovementLogByTransactionId(id);

      if (!movementLog) {
        res.status(404).json({
          success: false,
          message: 'Movement log not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement log retrieved successfully',
        data: movementLog,
      } as ApiResponse);
    } catch (error) {
      console.error('Get movement log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Create movement log
  static async createMovementLog(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      if (!data.transaction_id || !data.transaction_date) {
        res.status(400).json({
          success: false,
          message: 'Transaction ID and date are required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Set created_by from authenticated user
      if (req.user) {
        data.created_by = req.user.id;
      }

      const newMovementLog = await MovementLogService.createMovementLog(data);

      res.status(201).json({
        success: true,
        message: 'Movement log created successfully',
        data: newMovementLog,
      } as ApiResponse);
    } catch (error) {
      console.error('Create movement log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Update movement log
  static async updateMovementLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      // Only accept transaction_id format (non-numeric strings)
      if (/^\d+$/.test(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameter. Please use transaction_id instead of numeric ID.',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const movementLog = await MovementLogService.getMovementLogByTransactionId(id);

      if (!movementLog) {
        res.status(404).json({
          success: false,
          message: 'Movement log not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      const updatedMovementLog = await MovementLogService.updateMovementLog(movementLog.id, data);

      if (!updatedMovementLog) {
        res.status(404).json({
          success: false,
          message: 'Movement log not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement log updated successfully',
        data: updatedMovementLog,
      } as ApiResponse);
    } catch (error) {
      console.error('Update movement log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Delete movement log
  static async deleteMovementLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Only accept transaction_id format (non-numeric strings)
      if (/^\d+$/.test(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid parameter. Please use transaction_id instead of numeric ID.',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const movementLog = await MovementLogService.getMovementLogByTransactionId(id);

      if (!movementLog) {
        res.status(404).json({
          success: false,
          message: 'Movement log not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      const deleted = await MovementLogService.deleteMovementLog(movementLog.id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Movement log not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement log deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete movement log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await MovementLogService.getDashboardStats();

      res.status(200).json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats,
      } as ApiResponse);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get movement logs by trip ID
  static async getMovementLogsByTripId(req: Request, res: Response): Promise<void> {
    try {
      const { tripId } = req.params;

      const logs = await MovementLogService.getMovementLogsByTripId(tripId);

      if (logs.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No movement logs found for this trip ID',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement logs retrieved successfully',
        data: logs,
      } as ApiResponse);
    } catch (error) {
      console.error('Get movement logs by trip ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get movement logs by document number
  static async getMovementLogsByDocumentNo(req: Request, res: Response): Promise<void> {
    try {
      const { documentNo } = req.params;

      const logs = await MovementLogService.getMovementLogsByDocumentNo(documentNo);

      if (logs.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No movement logs found for this document number',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement logs retrieved successfully',
        data: logs,
      } as ApiResponse);
    } catch (error) {
      console.error('Get movement logs by document number error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
