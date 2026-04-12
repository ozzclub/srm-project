import * as XLSX from 'xlsx';
import { pool } from '../../config/database';
import { Material } from '../../types/material.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ImportRowResult {
  row: number;
  success: boolean;
  material_code?: string;
  error?: string;
  action?: 'inserted' | 'replaced' | 'skipped';
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  inserted: number;
  replaced: number;
  skipped: number;
  details: ImportRowResult[];
}

export interface ParsedMaterialRow {
  rowNumber: number;
  material_code?: string;
  description: string;
  material_type_names?: string[];
  remarks?: string;
  unit: string;
  unit_price?: number;
  whse?: string;
}

export interface DuplicateInfo {
  code: string;
  rows: number[];
}

export interface ExistingMaterialInfo {
  material_code: string;
  row: number;
  existing: {
    id: number;
    description: string;
    unit: string;
    unit_price: number;
    whse?: string;
    remarks?: string;
    material_type_ids?: number[];
    material_type_names?: string[];
  };
  newData: {
    description: string;
    unit: string;
    unit_price: number;
    whse?: string;
    remarks?: string;
    material_type_names?: string[];
  };
}

export interface ImportPreview {
  newCount: number;
  replaceCount: number;
  skipCount: number;
  existingMaterials: ExistingMaterialInfo[];
  totalParsed: number;
}

export type ImportMode = 'insert' | 'replace' | 'skip' | 'smart';

export type FieldChoice = 'old' | 'new' | 'merge';

export interface FieldChoices {
  [materialCode: string]: {
    description?: FieldChoice;
    material_type_ids?: FieldChoice;
    remarks?: FieldChoice;
    unit_price?: FieldChoice;
    whse?: FieldChoice;
  };
}

export interface ImportOptions {
  mode: ImportMode;
  fieldChoices?: FieldChoices;
}

export class MaterialImportService {
  // Detect duplicate material codes within the Excel file
  private static detectDuplicateCodesInFile(rows: ParsedMaterialRow[]): DuplicateInfo[] {
    const codeMap = new Map<string, number[]>();
    
    for (const row of rows) {
      if (row.material_code) {
        const existing = codeMap.get(row.material_code) || [];
        existing.push(row.rowNumber);
        codeMap.set(row.material_code, existing);
      }
    }

    const duplicates: DuplicateInfo[] = [];
    for (const [code, rows] of codeMap) {
      if (rows.length > 1) {
        duplicates.push({ code, rows });
      }
    }

    return duplicates;
  }

  // Check if material codes already exist in database and return full info
  private static async checkCodesAgainstDatabase(codes: string[]): Promise<ExistingMaterialInfo[]> {
    if (codes.length === 0) return [];

    const placeholders = codes.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.material_code, m.id, m.description, m.unit, m.unit_price, m.whse, m.remarks,
              GROUP_CONCAT(DISTINCT mt.id ORDER BY mt.id SEPARATOR ',') as material_type_ids,
              GROUP_CONCAT(DISTINCT mt.type_name ORDER BY mt.type_name SEPARATOR ', ') as material_type_names
       FROM materials m
       LEFT JOIN material_type_relations mtr ON m.id = mtr.material_id
       LEFT JOIN material_types mt ON mtr.type_id = mt.id
       WHERE m.material_code IN (${placeholders})
       GROUP BY m.material_code, m.id, m.description, m.unit, m.unit_price, m.whse, m.remarks`,
      codes
    );

    // Map rows to their data for easy lookup
    const existingMap = new Map<string, any>();
    rows.forEach((row: any) => {
      existingMap.set(row.material_code, row);
    });

    // Build result with row numbers from parsed data
    const existingMaterials: ExistingMaterialInfo[] = [];

    for (const row of rows) {
      existingMaterials.push({
        material_code: row.material_code,
        row: 0, // Will be set later
        existing: {
          id: row.id,
          description: row.description,
          unit: row.unit,
          unit_price: row.unit_price,
          whse: row.whse || '',
          remarks: row.remarks || '',
          material_type_ids: row.material_type_ids
            ? row.material_type_ids.split(',').map((id: string) => parseInt(id))
            : [],
          material_type_names: row.material_type_names
            ? row.material_type_names.split(', ')
            : [],
        },
        newData: {
          description: '',
          unit: '',
          unit_price: 0,
          whse: '',
          remarks: '',
        }, // Will be filled later
      });
    }

    return existingMaterials;
  }

  // Preview import - check what will happen
  static async previewImport(rows: ParsedMaterialRow[]): Promise<ImportPreview> {
    // First, detect duplicates within the file
    const seenCodes = new Map<string, number>();
    const uniqueRows: ParsedMaterialRow[] = [];
    
    for (const row of rows) {
      if (row.material_code) {
        if (seenCodes.has(row.material_code)) {
          continue; // Skip duplicate in preview
        }
        seenCodes.set(row.material_code, row.rowNumber);
      }
      uniqueRows.push(row);
    }

    // Get all material codes from the file
    const codesToCheck = uniqueRows
      .map(row => row.material_code)
      .filter((code): code is string => code !== undefined && code !== '');

    const existingMaterials = await this.checkCodesAgainstDatabase(codesToCheck);

    // Create a map for quick lookup
    const existingMap = new Map<string, ExistingMaterialInfo>();
    existingMaterials.forEach(info => {
      existingMap.set(info.material_code, info);
    });

    // Count and match rows
    let newCount = 0;
    let replaceCount = 0;

    for (const row of uniqueRows) {
      if (row.material_code && existingMap.has(row.material_code)) {
        const existing = existingMap.get(row.material_code)!;
        existing.row = row.rowNumber;
        existing.newData = {
          description: row.description,
          unit: row.unit,
          unit_price: row.unit_price || 0,
          whse: row.whse || '',
          remarks: row.remarks || '',
          material_type_names: row.material_type_names || [],
        };
        replaceCount++;
      } else {
        newCount++;
      }
    }

    return {
      newCount,
      replaceCount,
      skipCount: 0,
      existingMaterials,
      totalParsed: rows.length,
    };
  }
  // Parse Excel file and return validated data
  static parseExcelFile(buffer: Buffer): ParsedMaterialRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file must contain at least one sheet');
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ''
    });

    if (rawData.length < 2) {
      throw new Error('Excel file must contain header row and at least one data row');
    }

    // Normalize headers: trim, lowercase
    const headers = rawData[0].map((h: any) => String(h).trim().toLowerCase());

    // Map header names to indices with flexible matching
    // Accept variations: "Material Code", "material_code", "MaterialCode", etc.
    const headerMap: Record<string, number> = {};
    
    headers.forEach((header: string, index: number) => {
      // Store exact normalized header
      headerMap[header] = index;
      
      // Also store simplified versions for flexible matching
      if (header.includes('material') && header.includes('code')) {
        headerMap['material_code'] = index;
      }
      if (header.includes('material') && header.includes('type')) {
        headerMap['material_type'] = index;
      }
      if (header === 'type' || header === 'type_name') {
        headerMap['material_type'] = index;
      }
      if (header.includes('description') || header === 'desc') {
        headerMap['description'] = index;
      }
      if (header.includes('remark') || header === 'note' || header === 'notes') {
        headerMap['remarks'] = index;
      }
      if (header.includes('unit') || header === 'uom') {
        headerMap['unit'] = index;
      }
      if (header.includes('price') || header.includes('unit_price') || header === 'price') {
        headerMap['unit_price'] = index;
      }
      if (header.includes('whse') || header.includes('warehouse') || header === 'wh') {
        headerMap['whse'] = index;
      }
    });

    // Validate required header
    if (headerMap['description'] === undefined) {
      throw new Error(`Excel file must contain 'Description' column`);
    }

    // Parse data rows
    const parsedRows: ParsedMaterialRow[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];

      // Skip rows that are completely empty or only whitespace
      // This handles phantom rows, formatting artifacts, and intentional gaps
      if (!row || row.every((cell: any) => {
        if (cell === null || cell === undefined) return true;
        if (typeof cell === 'string' && cell.trim() === '') return true;
        if (cell === 0) return true; // Treat 0 as empty for skip detection
        return false;
      })) {
        continue; // Skip this empty row silently
      }

      const getValue = (columnName: string): any => {
        const index = headerMap[columnName];
        if (index === undefined) return '';
        const value = row[index];
        // Handle all types: string, number, boolean, etc.
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return String(value).trim();
      };

      const description = getValue('description');

      // Skip rows with empty description (only required field)
      // This allows users to have partially filled rows that will be ignored
      if (!description || description.trim() === '') {
        continue; // Skip rows without description, no error
      }

      // Truncate description to max 255 chars (database limit)
      const truncatedDescription = description.length > 255
        ? description.substring(0, 255)
        : description;

      // Parse material_code - handle numbers too
      const materialCodeRaw = getValue('material_code');
      const materialCode = materialCodeRaw && materialCodeRaw.trim() !== '' 
        ? materialCodeRaw.trim() 
        : undefined;

      // Parse material_type_name - support comma-separated values for multiple types
      const materialTypeNameRaw = getValue('material_type');
      let materialTypeNames: string[] | undefined;
      if (materialTypeNameRaw && materialTypeNameRaw.trim() !== '') {
        // Split by comma and trim each name
        materialTypeNames = materialTypeNameRaw
          .split(',')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0);
      }

      // Parse unit - keep empty if not provided
      const unitStr = getValue('unit');
      const unit = unitStr && unitStr.trim() !== '' ? unitStr.trim() : '';

      const unitPriceStr = getValue('unit_price');
      const unitPrice = unitPriceStr ? parseFloat(unitPriceStr) : undefined;

      const remarks = getValue('remarks');
      const whse = getValue('whse');

      parsedRows.push({
        rowNumber: i + 1,
        material_code: materialCode,
        description: truncatedDescription,
        material_type_names: materialTypeNames,
        remarks: remarks || undefined,
        unit,
        unit_price: unitPrice !== undefined && !isNaN(unitPrice) ? unitPrice : undefined,
        whse: whse || undefined,
      });
    }

    return parsedRows;
  }

  // Get or create material types by names (supports multiple types)
  private static async getOrCreateMaterialTypes(typeNames: string[]): Promise<number[]> {
    if (!typeNames || typeNames.length === 0) {
      return [];
    }

    const typeIds: number[] = [];

    for (const typeName of typeNames) {
      const trimmedName = typeName.trim();
      if (!trimmedName) continue;

      // Check if type exists
      const [existingRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM material_types WHERE LOWER(type_name) = LOWER(?)',
        [trimmedName]
      );

      if (existingRows.length > 0) {
        typeIds.push(existingRows[0].id);
      } else {
        // Create new type
        const [result] = await pool.query<ResultSetHeader>(
          'INSERT INTO material_types (type_name, description) VALUES (?, ?)',
          [trimmedName, `Auto-created during import: ${trimmedName}`]
        );
        typeIds.push(result.insertId);
      }
    }

    return typeIds;
  }

  // Generate unique material code with counter to avoid duplicates
  private static codeCounter = 0;
  private static lastTimestamp = 0;
  
  private static generateMaterialCode(): string {
    const now = Date.now();
    
    // If same timestamp, increment counter
    if (now === this.lastTimestamp) {
      this.codeCounter++;
    } else {
      this.codeCounter = 0;
      this.lastTimestamp = now;
    }

    // Combine timestamp and counter for uniqueness
    const timestampPart = now.toString().slice(-8);
    const counterPart = this.codeCounter.toString().padStart(2, '0');
    
    return `MTC-${timestampPart}${counterPart}`.slice(0, 20);
  }

  // Reset code generator (call before bulk import)
  private static resetCodeGenerator(): void {
    this.codeCounter = 0;
    this.lastTimestamp = 0;
  }

  // Import materials with transaction support and mode options
  static async importMaterials(rows: ParsedMaterialRow[], options: ImportOptions = { mode: 'insert' }): Promise<ImportResult> {
    // Reset code generator for this import session
    this.resetCodeGenerator();

    // Step 1: Detect and handle duplicate material codes within the Excel file
    // Instead of rejecting, we'll skip duplicates and keep first occurrence
    const seenCodes = new Map<string, number>(); // code -> first row number
    const rowsToImport: ParsedMaterialRow[] = [];
    const skippedDuplicates: ImportRowResult[] = [];

    for (const row of rows) {
      if (row.material_code) {
        if (seenCodes.has(row.material_code)) {
          // This is a duplicate - skip it but record it
          skippedDuplicates.push({
            row: row.rowNumber,
            success: true,
            material_code: row.material_code,
            action: 'skipped',
            error: `Duplicate of row ${seenCodes.get(row.material_code)}`,
          });
          continue;
        }
        seenCodes.set(row.material_code, row.rowNumber);
      }
      rowsToImport.push(row);
    }

    // Step 2: Build map of existing materials in database
    const codesToCheck = rowsToImport
      .map(row => row.material_code)
      .filter((code): code is string => code !== undefined && code !== '');

    const existingMaterials = await this.checkCodesAgainstDatabase(codesToCheck);
    const existingMap = new Map<string, ExistingMaterialInfo>();
    existingMaterials.forEach(info => {
      existingMap.set(info.material_code, info);
    });

    // Step 3: Process import based on mode
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const details: ImportRowResult[] = [];
      let insertedCount = 0;
      let replacedCount = 0;
      let skippedCount = skippedDuplicates.length; // Count duplicates as skipped

      for (const row of rowsToImport) {
        try {
          const isExisting = row.material_code ? existingMap.has(row.material_code) : false;
          const existingInfo = isExisting && row.material_code ? existingMap.get(row.material_code)! : null;

          // Handle based on mode
          if (isExisting && existingInfo) {
            if (options.mode === 'skip') {
              // Skip existing materials
              details.push({
                row: row.rowNumber,
                success: true,
                material_code: row.material_code,
                action: 'skipped',
              });
              skippedCount++;
              continue;
            }

            if (options.mode === 'replace' || options.mode === 'smart') {
              // Determine field choices for smart mode
              const code = row.material_code;
              const choices = options.mode === 'smart' && options.fieldChoices && code
                ? options.fieldChoices[code] || {}
                : {};

              // Resolve each field based on choice
              const finalDescription = choices.description === 'old' && existingInfo
                ? existingInfo.existing.description
                : row.description;

              const finalRemarks = choices.remarks === 'old' && existingInfo
                ? (existingInfo.existing.remarks || '')
                : (row.remarks || '');

              const finalUnitPrice = choices.unit_price === 'old' && existingInfo
                ? existingInfo.existing.unit_price
                : (row.unit_price || 0);

              const finalWhse = choices.whse === 'old' && existingInfo
                ? (existingInfo.existing.whse || '')
                : (row.whse || '');

              // Handle types based on choice
              let materialTypeIds: number[];
              if (choices.material_type_ids === 'merge' && existingInfo) {
                // Merge: combine old + new (no duplicates)
                const existingTypeIds = existingInfo.existing.material_type_ids || [];
                const newTypeIds = row.material_type_names && row.material_type_names.length > 0
                  ? await this.getOrCreateMaterialTypes(row.material_type_names)
                  : [];
                materialTypeIds = [...new Set([...existingTypeIds, ...newTypeIds])];
              } else if (choices.material_type_ids === 'old' && existingInfo) {
                materialTypeIds = existingInfo.existing.material_type_ids || [];
              } else {
                // Default: use new
                materialTypeIds = row.material_type_names && row.material_type_names.length > 0
                  ? await this.getOrCreateMaterialTypes(row.material_type_names)
                  : [];
              }

              // Update material fields
              await connection.query<ResultSetHeader>(
                `UPDATE materials SET
                  description = ?,
                  remarks = ?,
                  unit = ?,
                  unit_price = ?,
                  whse = ?
                WHERE material_code = ?`,
                [
                  finalDescription,
                  finalRemarks,
                  row.unit,
                  finalUnitPrice,
                  finalWhse,
                  row.material_code,
                ]
              );

              // Update type relations
              if (materialTypeIds.length > 0) {
                await connection.query('DELETE FROM material_type_relations WHERE material_id = (SELECT id FROM materials WHERE material_code = ?)', [row.material_code]);
                for (const typeId of materialTypeIds) {
                  await connection.query(
                    'INSERT IGNORE INTO material_type_relations (material_id, type_id) SELECT m.id, ? FROM materials m WHERE m.material_code = ?',
                    [typeId, row.material_code]
                  );
                }
              } else {
                // Clear all type relations
                await connection.query('DELETE FROM material_type_relations WHERE material_id = (SELECT id FROM materials WHERE material_code = ?)', [row.material_code]);
              }

              details.push({
                row: row.rowNumber,
                success: true,
                material_code: row.material_code,
                action: 'replaced',
              });
              replacedCount++;
              continue;
            }

            // Mode 'insert' - reject duplicates
            details.push({
              row: row.rowNumber,
              success: false,
              error: `Material code '${row.material_code}' already exists in database`,
            });
            continue;
          }

          // New material - INSERT
          const materialTypeIds = row.material_type_names
            ? await this.getOrCreateMaterialTypes(row.material_type_names)
            : [];

          const materialCode = row.material_code || this.generateMaterialCode();

          await connection.query<ResultSetHeader>(
            'INSERT INTO materials (material_code, description, remarks, unit, unit_price, whse) VALUES (?, ?, ?, ?, ?, ?)',
            [
              materialCode,
              row.description,
              row.remarks || '',
              row.unit,
              row.unit_price || 0,
              row.whse || '',
            ]
          );

          // Insert type relations
          if (materialTypeIds.length > 0) {
            const insertedIdResult = await connection.query<RowDataPacket[]>('SELECT id FROM materials WHERE material_code = ?', [materialCode]);
            const materialId = (insertedIdResult[0] as any)[0].id;
            const relationValues = materialTypeIds
              .map((typeId) => `(${materialId}, ${typeId})`)
              .join(',');
            await connection.query(`INSERT INTO material_type_relations (material_id, type_id) VALUES ${relationValues}`);
          }

          details.push({
            row: row.rowNumber,
            success: true,
            material_code: materialCode,
            action: 'inserted',
          });
          insertedCount++;

        } catch (error: any) {
          details.push({
            row: row.rowNumber,
            success: false,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Check if any rows failed - rollback entire import
      const failedCount = details.filter(d => !d.success).length;

      if (failedCount > 0) {
        await connection.rollback();
        return {
          total: rows.length,
          success: 0,
          failed: rows.length,
          inserted: 0,
          replaced: 0,
          skipped: 0,
          details,
        };
      }

      // All successful - commit
      await connection.commit();

      // Merge skipped duplicates into final details
      const allDetails = [...details, ...skippedDuplicates];

      return {
        total: rows.length,
        success: details.filter(d => d.success).length + skippedDuplicates.length,
        failed: 0,
        inserted: insertedCount,
        replaced: replacedCount,
        skipped: skippedCount,
        details: allDetails.sort((a, b) => a.row - b.row), // Sort by row number
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get all material types (for frontend matching)
  static async getMaterialTypes(): Promise<Array<{ id: number; type_name: string }>> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, type_name FROM material_types ORDER BY type_name ASC'
    );
    return rows as Array<{ id: number; type_name: string }>;
  }
}
