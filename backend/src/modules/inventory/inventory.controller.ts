import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { InventoryQueryParams, CreateInventoryDTO } from '../../types/spp.types';

export class InventoryController {
  // Get all inventory items
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { location_id, material_id, item_type, condition_status } = req.query;

      const params: InventoryQueryParams = {
        location_id: location_id ? parseInt(location_id as string) : undefined,
        material_id: material_id ? parseInt(material_id as string) : undefined,
        item_type: item_type as 'TOOL' | 'MATERIAL' | undefined,
        condition_status: condition_status as string | undefined,
      };

      const result = await InventoryService.getAllInventory(params);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get inventory by ID
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid inventory ID',
        });
        return;
      }

      const inventory = await InventoryService.getInventoryById(id);

      if (!inventory) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
        return;
      }

      res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get tools only
  static async getTools(req: Request, res: Response): Promise<void> {
    try {
      const tools = await InventoryService.getTools();

      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      console.error('Error fetching tools:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tools',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get materials only
  static async getMaterials(req: Request, res: Response): Promise<void> {
    try {
      const materials = await InventoryService.getMaterials();

      res.json({
        success: true,
        data: materials,
      });
    } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch materials',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Create inventory item
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateInventoryDTO = req.body;

      if (!data.spp_item_id || !data.item_type || !data.quantity || !data.received_from_spp) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: spp_item_id, item_type, quantity, received_from_spp',
        });
        return;
      }

      const inventory = await InventoryService.createInventory(data);

      res.status(201).json({
        success: true,
        data: inventory,
        message: 'Inventory item created successfully',
      });
    } catch (error) {
      console.error('Error creating inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create inventory',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update inventory item
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid inventory ID',
        });
        return;
      }

      const inventory = await InventoryService.updateInventory(id, data);

      if (!inventory) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
        return;
      }

      res.json({
        success: true,
        data: inventory,
        message: 'Inventory item updated successfully',
      });
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Delete inventory item
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid inventory ID',
        });
        return;
      }

      const deleted = await InventoryService.deleteInventory(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Inventory item deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete inventory',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get inventory statistics
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await InventoryService.getInventoryStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
