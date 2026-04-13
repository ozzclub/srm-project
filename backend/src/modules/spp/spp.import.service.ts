import * as XLSX from 'xlsx';
import { SPPService } from './spp.service';

interface SPPImportRow {
  no: number;
  list_item: string;
  description: string;
  unit: string;
  request_qty: number;
}

export interface PreviewResult {
  total_rows: number;
  valid_count: number;
  failed_count: number;
  errors: string[];
  items: SPPImportRow[];
}

interface ImportResult {
  total_rows: number;
  imported_count: number;
  failed_count: number;
  errors: string[];
  spp_requests: any[];
}

export interface ImportOptions {
  request_date: string;
  requested_by: string;
  notes?: string;
}

export class SPPImportService {
  // Parse Excel file and return preview (no DB writes)
  static previewFromExcel(buffer: Buffer): PreviewResult {
    const result: PreviewResult = {
      total_rows: 0,
      valid_count: 0,
      failed_count: 0,
      errors: [],
      items: [],
    };

    try {
      // Read workbook
      // IMPORTANT: cellDates: false to get Excel serial numbers instead of Date objects
      // This avoids UTC timezone issues with Date objects
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error('No sheets found in Excel file');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      result.total_rows = jsonData.length;

      if (jsonData.length === 0) {
        throw new Error('No data rows found in Excel file');
      }

      // Parse all valid items
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const excelRowNumber = i + 2; // +2 because Excel is 1-indexed and has header

        try {
          const item = this.parseRow(row, excelRowNumber);
          result.items.push(item);
          result.valid_count++;
        } catch (error: any) {
          result.errors.push(`Row ${excelRowNumber}: ${error.message}`);
          result.failed_count++;
        }
      }

      if (result.items.length === 0) {
        throw new Error('No valid items to import');
      }

      return result;
    } catch (error: any) {
      throw new Error(`Excel preview failed: ${error.message}`);
    }
  }

  // Parse Excel file and import SPP requests
  // Uses provided options for request_date, requested_by, and notes
  static async importFromExcel(buffer: Buffer, options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      total_rows: 0,
      imported_count: 0,
      failed_count: 0,
      errors: [],
      spp_requests: [],
    };

    try {
      // Read workbook
      // IMPORTANT: cellDates: false to get Excel serial numbers instead of Date objects
      // This avoids UTC timezone issues with Date objects
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error('No sheets found in Excel file');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      result.total_rows = jsonData.length;

      if (jsonData.length === 0) {
        throw new Error('No data rows found in Excel file');
      }

      // Parse all valid items
      const items: SPPImportRow[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const excelRowNumber = i + 2; // +2 because Excel is 1-indexed and has header

        try {
          const item = this.parseRow(row, excelRowNumber);
          items.push(item);
        } catch (error: any) {
          result.errors.push(`Row ${excelRowNumber}: ${error.message}`);
          result.failed_count++;
        }
      }

      if (items.length === 0) {
        throw new Error('No valid items to import');
      }

      console.log(`[SPP Import] Creating request with ${items.length} items, request_date=${options.request_date}, requested_by=${options.requested_by}`);

      const sppRequest = await SPPService.createSPPRequest({
        request_date: options.request_date,
        requested_by: options.requested_by,
        notes: options.notes || `Imported from Excel with ${items.length} items`,
        items: items.map((item, index) => ({
          list_item_number: item.no || (index + 1),
          list_item: item.list_item,
          description: item.description,
          unit: item.unit,
          request_qty: item.request_qty,
          date_req: options.request_date,
        })),
      });

      // Initialize approvals
      await SPPService.initializeApprovals(sppRequest.id);

      result.imported_count = items.length;
      result.spp_requests.push(sppRequest);

      return result;
    } catch (error: any) {
      throw new Error(`Excel import failed: ${error.message}`);
    }
  }

  // Parse a single row from Excel
  private static parseRow(row: any, rowNumber: number): SPPImportRow {
    // Expected columns (case-insensitive matching)
    const no = this.getField(row, ['No', 'no', 'NO', 'Number', 'NUMBER']);
    const listItem = this.getField(row, ['List Item', 'list_item', 'LIST_ITEM', 'ListItem', 'listitem']);
    const description = this.getField(row, ['Deskripsi Item', 'description', 'DESCRIPTION', 'Description', 'deskripsi_item']);
    const unit = this.getField(row, ['Unit', 'unit', 'UNIT']);
    const requestQty = this.getField(row, ['Request_Qty', 'request_qty', 'REQUEST_QTY', 'Request Qty', 'RequestQty']);

    // Validation
    if (!listItem) {
      throw new Error('List Item is required');
    }

    if (!description) {
      throw new Error('Description is required');
    }

    if (!unit) {
      throw new Error('Unit is required');
    }

    if (!requestQty || requestQty <= 0) {
      throw new Error('Request quantity must be a positive number');
    }

    return {
      no: parseInt(no) || 0,
      list_item: listItem,
      description,
      unit,
      request_qty: parseFloat(requestQty),
    };
  }

  // Get field from row with case-insensitive matching
  private static getField(row: any, possibleNames: string[]): any {
    for (const name of possibleNames) {
      const lowerName = name.toLowerCase();
      for (const key in row) {
        if (key.toLowerCase() === lowerName) {
          return row[key];
        }
      }
    }
    return null;
  }

  // Generate Excel template
  static generateTemplate(): Buffer {
    const headers = [
      'No',
      'List Item',
      'Deskripsi Item',
      'Unit',
      'Request_Qty',
    ];

    const sampleData = [
      1,
      'Sample Item',
      'Sample description',
      'pcs',
      10,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // No
      { wch: 20 }, // List Item
      { wch: 40 }, // Deskripsi Item
      { wch: 10 }, // Unit
      { wch: 15 }, // Request_Qty
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SPP Request Template');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
