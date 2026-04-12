import { pool } from '../../config/database';
import { MaterialType, CreateMaterialTypeDTO, UpdateMaterialTypeDTO } from '../../types/material-type.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MaterialTypeService {
  // Get all material types
  static async getAllMaterialTypes(): Promise<MaterialType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM material_types ORDER BY type_name ASC'
    );
    return rows as unknown as MaterialType[];
  }

  // Get material type by ID
  static async getMaterialTypeById(id: number): Promise<MaterialType | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM material_types WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;
    return rows[0] as unknown as MaterialType;
  }

  // Create material type
  static async createMaterialType(data: CreateMaterialTypeDTO): Promise<MaterialType> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO material_types (type_name, description) VALUES (?, ?)',
      [data.type_name, data.description || '']
    );

    const newMaterialType = await this.getMaterialTypeById(result.insertId);
    if (!newMaterialType) throw new Error('Failed to create material type');

    return newMaterialType;
  }

  // Update material type
  static async updateMaterialType(id: number, data: UpdateMaterialTypeDTO): Promise<MaterialType | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.type_name !== undefined) {
      fields.push('type_name = ?');
      values.push(data.type_name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }

    if (fields.length === 0) {
      return this.getMaterialTypeById(id);
    }

    values.push(id);

    await pool.query<ResultSetHeader>(
      `UPDATE material_types SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getMaterialTypeById(id);
  }

  // Delete material type
  static async deleteMaterialType(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM material_types WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }
}
