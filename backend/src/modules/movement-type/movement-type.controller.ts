import { Request, Response } from 'express';
import { MovementTypeService } from './movement-type.service';
import { ApiResponse } from '../../types/api.types';

export class MovementTypeController {
  static async getAllMovementTypes(_req: Request, res: Response): Promise<void> {
    try {
      const movementTypes = await MovementTypeService.getAllMovementTypes();
      
      res.status(200).json({
        success: true,
        message: 'Movement types retrieved successfully',
        data: movementTypes,
      } as ApiResponse);
    } catch (error) {
      console.error('Get movement types error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async getMovementTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const movementType = await MovementTypeService.getMovementTypeById(parseInt(id));
      
      if (!movementType) {
        res.status(404).json({
          success: false,
          message: 'Movement type not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement type retrieved successfully',
        data: movementType,
      } as ApiResponse);
    } catch (error) {
      console.error('Get movement type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async createMovementType(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Movement type name is required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const newMovementType = await MovementTypeService.createMovementType({ name });

      res.status(201).json({
        success: true,
        message: 'Movement type created successfully',
        data: newMovementType,
      } as ApiResponse);
    } catch (error) {
      console.error('Create movement type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async updateMovementType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const updatedMovementType = await MovementTypeService.updateMovementType(parseInt(id), { name });
      
      if (!updatedMovementType) {
        res.status(404).json({
          success: false,
          message: 'Movement type not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement type updated successfully',
        data: updatedMovementType,
      } as ApiResponse);
    } catch (error) {
      console.error('Update movement type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async deleteMovementType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await MovementTypeService.deleteMovementType(parseInt(id));
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Movement type not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Movement type deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete movement type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
