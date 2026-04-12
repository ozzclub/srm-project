export interface MTORequest {
  id: number;
  mto_number: string;
  project_name: string;
  work_order_no: string | null;
  request_date: string;
  required_date: string | null;
  requested_by: string;
  approved_by: string | null;
  status: 'DRAFT' | 'APPROVED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MTOItem {
  id: number;
  mto_id: number;
  material_id: number;
  requested_qty: number;
  fulfilled_qty: number;
  unit: string;
  notes: string | null;
  created_at: string;
  material?: {
    id: number;
    material_code: string;
    description: string;
    remarks: string;
    material_type_id: number | null;
    material_type?: {
      id: number;
      type_name: string;
      description: string;
    };
  };
}

export interface MTORequestWithItems extends MTORequest {
  items: MTOItem[];
  fulfillment_percentage: number;
  total_items: number;
  completed_items: number;
}

export interface CreateMTORequestDTO {
  mto_number?: string;
  project_name: string;
  work_order_no?: string;
  request_date: string;
  required_date?: string;
  requested_by: string;
  notes?: string;
  created_by?: number;
  items: {
    material_id: number;
    requested_qty: number;
    notes?: string;
  }[];
}

export interface UpdateMTORequestDTO {
  project_name?: string;
  work_order_no?: string;
  request_date?: string;
  required_date?: string;
  requested_by?: string;
  approved_by?: string;
  status?: 'DRAFT' | 'APPROVED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface CreateMTOItemDTO {
  material_id: number;
  requested_qty: number;
  notes?: string;
}

export interface UpdateMTOItemDTO {
  material_id?: number;
  requested_qty?: number;
  fulfilled_qty?: number;
  notes?: string;
}

export interface MTOQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  project_name?: string;
}

export interface MTOFulfillmentStatus {
  mto_id: number;
  mto_number: string;
  total_requested: number;
  total_fulfilled: number;
  fulfillment_percentage: number;
  items: {
    item_id: number;
    material_id: number;
    material_name: string;
    requested_qty: number;
    fulfilled_qty: number;
    remaining_qty: number;
    unit: string;
  }[];
}
