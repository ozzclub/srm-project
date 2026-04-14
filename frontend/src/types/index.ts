// User types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'site' | 'workshop' | 'material_site';
  created_at: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'staff' | 'site' | 'workshop' | 'material_site';
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Material Type types
export interface MaterialType {
  id: number;
  type_name: string;
  description: string;
  created_at: string;
}

// Material types
export interface Material {
  id: number;
  material_code: string;
  description: string;
  material_type_ids: number[];
  material_types?: MaterialType[];
  remarks: string;
  unit: string;
  unit_price: number;
  whse: string;
  created_at: string;
}

export interface MaterialFormData {
  material_code: string;
  description: string;
  material_type_ids: number[];
  remarks: string;
  unit: string;
  unit_price: number;
  whse: string;
}

// Location types
export interface Location {
  id: number;
  location_name: string;
  location_type: 'warehouse' | 'workshop' | 'site';
  created_at: string;
}

// Movement Type types
export interface MovementType {
  id: number;
  name: string;
}

// Movement Log types
export interface MovementLog {
  id: number;
  transaction_id: string;
  transaction_date: string;
  trip_id: string | null;
  document_no: string | null;
  material_id: number | null;
  qty: number | null;
  from_location_id: number | null;
  to_location_id: number | null;
  movement_type_id: number | null;
  vehicle_driver: string | null;
  received_by: string | null;
  loading_time: string | null;
  unloading_time: string | null;
  condition_notes: string | null;
  documentation_link: string | null;
  created_by: number | null;
  created_at: string;
  material?: {
    id: number;
    material_code: string;
    description: string;
    material_type_ids: number[];
    material_types?: MaterialType[];
    remarks: string;
    unit: string;
    unit_price: number;
    whse: string;
  };
  from_location?: {
    id: number;
    location_name: string;
    location_type: string;
  };
  to_location?: {
    id: number;
    location_name: string;
    location_type: string;
  };
  movement_type?: {
    id: number;
    name: string;
  };
  created_by_user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface MovementLogFormData {
  transaction_id: string;
  transaction_date: string;
  trip_id: string;
  document_no: string;
  material_id: number;
  qty: number;
  from_location_id: number;
  to_location_id: number;
  movement_type_id: number;
  vehicle_driver: string;
  received_by: string;
  loading_time: string;
  unloading_time: string;
  condition_notes: string;
}

// Document types
export interface Document {
  id: number;
  transaction_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  category: string;
  uploaded_at: string;
}

// Dashboard types
export interface DashboardStats {
  todayCount: number;
  totalCount: number;
  recentLogs: MovementLog[];
}

// Pagination types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// MTO (Material Take Off) types
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
    material_type_ids: number[];
    material_types?: MaterialType[];
  };
}

export interface MTORequestWithItems extends MTORequest {
  items: MTOItem[];
  fulfillment_percentage: number;
  total_items: number;
  completed_items: number;
}

export interface MTOFormData {
  mto_number: string;
  project_name: string;
  work_order_no: string;
  request_date: string;
  required_date: string;
  requested_by: string;
  notes: string;
  items: {
    material_id: number;
    requested_qty: number;
    notes: string;
  }[];
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
