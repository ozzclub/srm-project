import { pool } from '../../config/database';
import { Document, DocumentWithMeta } from '../../types/document.types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import path from 'path';
import fs from 'fs';
import { config } from '../../config/env';

export class DocumentService {
  // Get all documents for a transaction
  static async getDocumentsByTransactionId(transactionId: string): Promise<DocumentWithMeta[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM documents WHERE transaction_id = ? ORDER BY uploaded_at DESC',
      [transactionId]
    );
    
    return rows as unknown as DocumentWithMeta[];
  }

  // Get document by ID
  static async getDocumentById(id: number): Promise<DocumentWithMeta | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    return rows[0] as unknown as DocumentWithMeta;
  }

  // Create document record
  static async createDocument(data: {
    transaction_id: string;
    file_url: string;
    category: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    uploaded_by?: number;
  }): Promise<Document> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO documents (transaction_id, file_url, category, file_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        data.transaction_id,
        data.file_url,
        data.category,
        data.file_name || null,
        data.file_size || null,
        data.mime_type || null,
        data.uploaded_by || null,
      ]
    );

    const newDocument = await this.getDocumentById(result.insertId);
    if (!newDocument) throw new Error('Failed to create document');
    
    return newDocument;
  }

  // Delete document
  static async deleteDocument(id: number): Promise<boolean> {
    const document = await this.getDocumentById(id);
    
    if (!document) return false;

    // Delete file from filesystem
    const filePath = path.join(config.upload.path, document.transaction_id, document.file_url);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM documents WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  // Delete all documents for a transaction
  static async deleteDocumentsByTransactionId(transactionId: string): Promise<boolean> {
    const documents = await this.getDocumentsByTransactionId(transactionId);
    
    // Delete all files
    for (const doc of documents) {
      const filePath = path.join(config.upload.path, transactionId, doc.file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM documents WHERE transaction_id = ?',
      [transactionId]
    );
    
    return result.affectedRows > 0;
  }
}
