import { Request, Response } from 'express';
import { MaterialTypeService } from './material-type.service';
import { ApiResponse } from '../../types/api.types';

export class MaterialTypeController {
  // Get all material types
  static async getAllMaterialTypes(_req: Request, res: Response): Promise<void> {
    try {
      const materialTypes = await MaterialTypeService.getAllMaterialTypes();

      res.status(200).json({
        success: true,
        message: 'Material types retrieved successfully',
        data: materialTypes,
      } as ApiResponse);
    } catch (error) {
      console.error('Get material types error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get material type by ID
  static async getMaterialTypeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const materialType = await MaterialTypeService.getMaterialTypeById(parseInt(id));

      if (!materialType) {
        res.status(404).json({
          success: false,
          message: 'Material type not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Material type retrieved successfully',
        data: materialType,
      } as ApiResponse);
    } catch (error) {
      console.error('Get material type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Create material type
  static async createMaterialType(req: Request, res: Response): Promise<void> {
    try {
      const { type_name, description } = req.body;

      if (!type_name) {
        res.status(400).json({
          success: false,
          message: 'Type name is required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const newMaterialType = await MaterialTypeService.createMaterialType({
        type_name,
        description: description || '',
      });

      res.status(201).json({
        success: true,
        message: 'Material type created successfully',
        data: newMaterialType,
      } as ApiResponse);
    } catch (error) {
      console.error('Create material type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Update material type
  static async updateMaterialType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const updatedMaterialType = await MaterialTypeService.updateMaterialType(parseInt(id), data);

      if (!updatedMaterialType) {
        res.status(404).json({
          success: false,
          message: 'Material type not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Material type updated successfully',
        data: updatedMaterialType,
      } as ApiResponse);
    } catch (error) {
      console.error('Update material type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Delete material type
  static async deleteMaterialType(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await MaterialTypeService.deleteMaterialType(parseInt(id));

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Material type not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Material type deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete material type error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
