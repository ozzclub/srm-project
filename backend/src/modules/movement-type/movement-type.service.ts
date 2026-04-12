import { pool } from '../../config/database';
import { MovementType, CreateMovementTypeDTO, UpdateMovementTypeDTO } from '../../types/movement-type.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MovementTypeService {
  static async getAllMovementTypes(): Promise<MovementType[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM movement_types ORDER BY name ASC'
    );
    return rows as unknown as MovementType[];
  }

  static async getMovementTypeById(id: number): Promise<MovementType | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM movement_types WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return rows[0] as unknown as MovementType;
  }

  static async createMovementType(data: CreateMovementTypeDTO): Promise<MovementType> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO movement_types (name) VALUES (?)',
      [data.name]
    );

    const newMovementType = await this.getMovementTypeById(result.insertId);
    if (!newMovementType) throw new Error('Failed to create movement type');
    
    return newMovementType;
  }

  static async updateMovementType(id: number, data: UpdateMovementTypeDTO): Promise<MovementType | null> {
    if (data.name === undefined) {
      return this.getMovementTypeById(id);
    }

    await pool.query<ResultSetHeader>(
      'UPDATE movement_types SET name = ? WHERE id = ?',
      [data.name, id]
    );

    return this.getMovementTypeById(id);
  }

  static async deleteMovementType(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM movement_types WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
}
