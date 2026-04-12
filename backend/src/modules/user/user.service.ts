import { pool } from '../../config/database';
import { User, UserResponse } from '../../types/user.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class UserService {
  // Get all users
  static async getAllUsers(): Promise<UserResponse[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows as unknown as UserResponse[];
  }

  // Get user by ID
  static async getUserById(id: number): Promise<UserResponse | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return rows[0] as unknown as UserResponse;
  }

  // Get user by email (with password for authentication)
  static async getUserByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) return null;
    return rows[0] as unknown as User;
  }

  // Create user
  static async createUser(data: { name: string; email: string; password: string; role: 'admin' | 'staff' }): Promise<UserResponse> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [data.name, data.email, data.password, data.role]
    );

    const newUser = await this.getUserById(result.insertId);
    if (!newUser) throw new Error('Failed to create user');
    
    return newUser;
  }

  // Update user
  static async updateUser(id: number, data: Partial<{ name: string; email: string; role: 'admin' | 'staff' }>): Promise<UserResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);

    await pool.query<ResultSetHeader>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getUserById(id);
  }

  // Delete user
  static async deleteUser(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
}
