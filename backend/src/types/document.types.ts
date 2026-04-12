// Document entity
export interface Document {
  id: number;
  transaction_id: string;
  file_url: string;
  category: string;
  uploaded_at: Date;
}

// Extended with file metadata
export interface DocumentWithMeta extends Document {
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: number;
}

// Upload response
export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data: {
    transaction_id: string;
    files: Array<{
      id: number;
      file_url: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      category: string;
    }>;
  };
}
