import { Request, Response } from 'express';
import { MaterialService } from './material.service';
import { MaterialImportService, ImportMode } from './material.import.service';
import { ApiResponse } from '../../types/api.types';

export class MaterialController {
  // Get all materials
  static async getAllMaterials(_req: Request, res: Response): Promise<void> {
    try {
      const materials = await MaterialService.getAllMaterials();
      
      res.status(200).json({
        success: true,
        message: 'Materials retrieved successfully',
        data: materials,
      } as ApiResponse);
    } catch (error) {
      console.error('Get materials error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get material by ID
  static async getMaterialById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const materialId = parseInt(id);

      if (isNaN(materialId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid material ID',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const material = await MaterialService.getMaterialById(materialId);

      if (!material) {
        res.status(404).json({
          success: false,
          message: 'Material not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Material retrieved successfully',
        data: material,
      } as ApiResponse);
    } catch (error) {
      console.error('Get material error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Create material
  static async createMaterial(req: Request, res: Response): Promise<void> {
    try {
      const { material_code, description, remarks, unit, unit_price, whse, material_type_ids } = req.body;

      // material_code is optional - will be auto-generated if not provided
      // description and unit are required
      if (!description || !unit) {
        res.status(400).json({
          success: false,
          message: 'Description and unit are required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const newMaterial = await MaterialService.createMaterial({
        material_code: material_code || undefined, // Pass undefined if empty to trigger auto-generation
        description,
        remarks: remarks || '',
        unit,
        unit_price: unit_price || 0,
        whse: whse || '',
        material_type_ids: material_type_ids || [],
      });

      res.status(201).json({
        success: true,
        message: 'Material created successfully',
        data: newMaterial,
      } as ApiResponse);
    } catch (error) {
      console.error('Create material error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Update material
  static async updateMaterial(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const updatedMaterial = await MaterialService.updateMaterial(parseInt(id), data);
      
      if (!updatedMaterial) {
        res.status(404).json({
          success: false,
          message: 'Material not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Material updated successfully',
        data: updatedMaterial,
      } as ApiResponse);
    } catch (error) {
      console.error('Update material error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Delete material
  static async deleteMaterial(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await MaterialService.deleteMaterial(parseInt(id));

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Material not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Material deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete material error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Import materials from Excel
  static async importMaterials(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          success: false,
          message: 'Only Excel files (.xlsx, .xls) are allowed',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Get import mode and fieldChoices from request body
      // With multipart/form-data, multer populates req.body after processing
      const modeRaw = req.body?.mode;
      const mode: ImportMode =
        modeRaw === 'replace' ? 'replace' :
        modeRaw === 'skip' ? 'skip' :
        modeRaw === 'smart' ? 'smart' :
        'insert';

      // Parse fieldChoices if provided (JSON string)
      let fieldChoices;
      if (req.body?.fieldChoices) {
        try {
          fieldChoices = JSON.parse(req.body.fieldChoices);
        } catch {
          fieldChoices = undefined;
        }
      }

      // Parse Excel file
      const parsedRows = MaterialImportService.parseExcelFile(req.file.buffer);

      if (parsedRows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid data rows found in Excel file',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Import materials with specified mode
      const result = await MaterialImportService.importMaterials(parsedRows, { mode, fieldChoices });

      if (result.failed > 0 && result.success === 0) {
        res.status(400).json({
          success: false,
          message: result.details[0]?.error || 'Import failed. All rows had errors.',
          statusCode: 400,
          data: result,
        } as ApiResponse);
        return;
      }

      let message = `Successfully imported ${result.inserted} material(s)`;
      if (result.replaced > 0) {
        message += `, replaced ${result.replaced} material(s)`;
      }
      if (result.skipped > 0) {
        message += `, skipped ${result.skipped} material(s)`;
      }

      res.status(200).json({
        success: true,
        message,
        data: result,
      } as ApiResponse);
    } catch (error: any) {
      console.error('Import materials error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Preview import - check what will happen
  static async previewImport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Parse Excel file
      const parsedRows = MaterialImportService.parseExcelFile(req.file.buffer);

      if (parsedRows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid data rows found in Excel file',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Generate preview
      const preview = await MaterialImportService.previewImport(parsedRows);

      res.status(200).json({
        success: true,
        message: 'Import preview generated successfully',
        data: preview,
      } as ApiResponse);
    } catch (error: any) {
      console.error('Preview import error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Download import template
  static async downloadTemplate(_req: Request, res: Response): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Define headers and sample data
      const headers = [
        'Material Code',
        'Description',
        'Material Type',
        'Remarks',
        'Unit',
        'Unit Price',
        'WHSE',
      ];
      
      const sampleData = [
        ['', 'Example Material', 'Raw Material', 'This is a sample', 'pcs', 100.50, 'WH-01'],
      ];
      
      // Combine headers and sample data
      const wsData = [headers, ...sampleData];
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Material Code
        { wch: 30 }, // Description
        { wch: 20 }, // Material Type
        { wch: 30 }, // Remarks
        { wch: 10 }, // Unit
        { wch: 12 }, // Unit Price
        { wch: 10 }, // WHSE
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=material-import-template.xlsx'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      // Send file
      res.send(buffer);
    } catch (error: any) {
      console.error('Download template error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
