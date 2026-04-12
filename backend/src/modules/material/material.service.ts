import { pool } from '../../config/database';
import { Material, CreateMaterialDTO, UpdateMaterialDTO } from '../../types/material.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MaterialService {
  // Generate unique material code with format: MTC-XXXXXXXX
  // Uses timestamp to ensure uniqueness without database queries
  private static generateMaterialCode(): string {
    const timestamp = Date.now().toString();
    // Use last 8 digits of timestamp for cleaner codes
    const code = timestamp.slice(-8);
    return `MTC-${code}`;
  }

  // Helper: transform raw rows with joined type data into Material objects
  private static transformMaterialWithTypes(rows: RowDataPacket[]): Material[] {
    // Group by material id
    const materialMap = new Map<number, { material: any; types: any[] }>();

    for (const row of rows as any[]) {
      if (!materialMap.has(row.id)) {
        materialMap.set(row.id, {
          material: row,
          types: [],
        });
      }

      if (row.type_id) {
        const entry = materialMap.get(row.id)!;
        entry.types.push({
          id: row.type_id,
          type_name: row.type_name,
          description: row.type_description,
          created_at: row.type_created_at,
        });
      }
    }

    return Array.from(materialMap.entries()).map(([id, { material, types }]) => ({
      id: material.id,
      material_code: material.material_code,
      description: material.description,
      remarks: material.remarks,
      unit: material.unit,
      unit_price: material.unit_price,
      whse: material.whse,
      material_type_ids: types.map((t: any) => t.id),
      material_types: types.length > 0 ? types : undefined,
      created_at: material.created_at,
    }));
  }

  // Get all materials
  static async getAllMaterials(): Promise<Material[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, mt.id as type_id, mt.type_name, mt.description as type_description, mt.created_at as type_created_at
       FROM materials m
       LEFT JOIN material_type_relations mtr ON m.id = mtr.material_id
       LEFT JOIN material_types mt ON mtr.type_id = mt.id
       ORDER BY m.description ASC, mt.type_name ASC`
    );

    return this.transformMaterialWithTypes(rows);
  }

  // Get material by ID
  static async getMaterialById(id: number): Promise<Material | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, mt.id as type_id, mt.type_name, mt.description as type_description, mt.created_at as type_created_at
       FROM materials m
       LEFT JOIN material_type_relations mtr ON m.id = mtr.material_id
       LEFT JOIN material_types mt ON mtr.type_id = mt.id
       WHERE m.id = ?
       ORDER BY mt.type_name ASC`,
      [id]
    );

    if (rows.length === 0) return null;

    const materials = this.transformMaterialWithTypes(rows);
    return materials[0] || null;
  }

  // Create material
  static async createMaterial(data: CreateMaterialDTO): Promise<Material> {
    // Auto-generate material code if not provided or empty
    const materialCode = (!data.material_code || data.material_code.trim() === '')
      ? this.generateMaterialCode()
      : data.material_code;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO materials (material_code, description, remarks, unit, unit_price, whse) VALUES (?, ?, ?, ?, ?, ?)',
      [materialCode, data.description, data.remarks || '', data.unit, data.unit_price || 0, data.whse || '']
    );

    const materialId = result.insertId;

    // Insert type relations if provided
    if (data.material_type_ids && data.material_type_ids.length > 0) {
      const values = data.material_type_ids
        .map((typeId) => `(${materialId}, ${typeId})`)
        .join(',');
      await pool.query(`INSERT INTO material_type_relations (material_id, type_id) VALUES ${values}`);
    }

    const newMaterial = await this.getMaterialById(materialId);
    if (!newMaterial) throw new Error('Failed to create material');

    return newMaterial;
  }

  // Update material
  static async updateMaterial(id: number, data: UpdateMaterialDTO): Promise<Material | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.material_code !== undefined) {
      fields.push('material_code = ?');
      values.push(data.material_code);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.remarks !== undefined) {
      fields.push('remarks = ?');
      values.push(data.remarks);
    }
    if (data.unit !== undefined) {
      fields.push('unit = ?');
      values.push(data.unit);
    }
    if (data.unit_price !== undefined) {
      fields.push('unit_price = ?');
      values.push(data.unit_price);
    }
    if (data.whse !== undefined) {
      fields.push('whse = ?');
      values.push(data.whse);
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query<ResultSetHeader>(
        `UPDATE materials SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Handle type relations update
    if (data.material_type_ids !== undefined) {
      // Delete existing relations
      await pool.query('DELETE FROM material_type_relations WHERE material_id = ?', [id]);

      // Insert new relations
      if (data.material_type_ids.length > 0) {
        const relationValues = data.material_type_ids
          .map((typeId) => `(${id}, ${typeId})`)
          .join(',');
        await pool.query(`INSERT INTO material_type_relations (material_id, type_id) VALUES ${relationValues}`);
      }
    }

    return this.getMaterialById(id);
  }

  // Delete material
  static async deleteMaterial(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM materials WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }
}
