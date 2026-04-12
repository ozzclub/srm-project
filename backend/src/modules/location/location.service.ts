import { pool } from '../../config/database';
import { Location, CreateLocationDTO, UpdateLocationDTO } from '../../types/location.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class LocationService {
  // Get all locations
  static async getAllLocations(): Promise<Location[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM locations ORDER BY location_name ASC'
    );
    return rows as unknown as Location[];
  }

  // Get location by ID
  static async getLocationById(id: number): Promise<Location | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM locations WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return rows[0] as unknown as Location;
  }

  // Create location
  static async createLocation(data: CreateLocationDTO): Promise<Location> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO locations (location_name, location_type) VALUES (?, ?)',
      [data.location_name, data.location_type]
    );

    const newLocation = await this.getLocationById(result.insertId);
    if (!newLocation) throw new Error('Failed to create location');
    
    return newLocation;
  }

  // Update location
  static async updateLocation(id: number, data: UpdateLocationDTO): Promise<Location | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.location_name !== undefined) {
      fields.push('location_name = ?');
      values.push(data.location_name);
    }
    if (data.location_type !== undefined) {
      fields.push('location_type = ?');
      values.push(data.location_type);
    }

    if (fields.length === 0) {
      return this.getLocationById(id);
    }

    values.push(id);

    await pool.query<ResultSetHeader>(
      `UPDATE locations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getLocationById(id);
  }

  // Delete location
  static async deleteLocation(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM locations WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
}
