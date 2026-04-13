// SPP Request entity
export interface SPPRequest {
  id: number;
  spp_number: string;
  request_date: string;
  requested_by: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// SPP Item entity
export interface SPPItem {
  id: number;
  spp_id: number;
  material_id: number | null;
  list_item_number: number;
  list_item: string;
  description: string;
  unit: string;
  request_qty: number;
  receive_qty: number;
  remaining_qty: number;
  request_status: 'PENDING' | 'PARTIAL' | 'FULFILLED';
  date_req: string;
  item_status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED';
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

// SPP Approval entity
export interface SPPApproval {
  id: number;
  spp_id: number;
  approved_by: number;
  approval_role: 'workshop' | 'material_site';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approval_notes: string | null;
  approved_at: string;
  created_at: string;
}

// Inventory entity
export interface Inventory {
  id: number;
  spp_item_id: number;
  material_id: number | null;
  item_type: 'TOOL' | 'MATERIAL';
  quantity: number;
  condition_status: 'GOOD' | 'DAMAGED' | 'CONSUMED';
  location_id: number | null;
  received_from_spp: string;
  received_at: string;
  created_at: string;
}

// SPP Request with items
export interface SPPRequestWithItems extends SPPRequest {
  items: SPPItem[];
  fulfillment_percentage: number;
  total_items: number;
  completed_items: number;
}

// Create SPP Request DTO
export interface CreateSPPRequestDTO {
  spp_number?: string;
  request_date: string;
  requested_by: string;
  notes?: string;
  created_by?: number;
  items: {
    material_id?: number;
    list_item_number?: number;
    list_item: string;
    description: string;
    unit: string;
    request_qty: number;
    date_req: string;
  }[];
}

// Update SPP Request DTO
export interface UpdateSPPRequestDTO {
  request_date?: string;
  requested_by?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

// Create SPP Item DTO
export interface CreateSPPItemDTO {
  material_id?: number;
  list_item_number?: number;
  list_item: string;
  description: string;
  unit: string;
  request_qty: number;
  date_req: string;
}

// Update SPP Item DTO
export interface UpdateSPPItemDTO {
  material_id?: number;
  list_item?: string;
  description?: string;
  unit?: string;
  request_qty?: number;
  receive_qty?: number;
  date_req?: string;
  item_status?: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED';
}

// SPP Query Params
export interface SPPQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  requested_by?: string;
}

// SPP Fulfillment Status
export interface SPPFulfillmentStatus {
  spp_id: number;
  spp_number: string;
  total_requested: number;
  total_received: number;
  fulfillment_percentage: number;
  items: {
    item_id: number;
    material_id: number | null;
    description: string;
    request_qty: number;
    receive_qty: number;
    remaining_qty: number;
    unit: string;
    request_status: string;
  }[];
}

// Approval DTO
export interface ApproveSPPDTO {
  approval_role: 'workshop' | 'material_site';
  approval_status: 'APPROVED' | 'REJECTED';
  approval_notes?: string;
}

// Receive DTO
export interface ReceiveSPPItemDTO {
  receive_qty: number;
  item_status?: 'IN_TRANSIT' | 'RECEIVED';
}

// Inventory Query Params
export interface InventoryQueryParams {
  location_id?: number;
  material_id?: number;
  item_type?: 'TOOL' | 'MATERIAL';
  condition_status?: string;
}

// Create Inventory DTO
export interface CreateInventoryDTO {
  spp_item_id: number;
  material_id: number | null;
  item_type: 'TOOL' | 'MATERIAL';
  quantity: number;
  condition_status?: 'GOOD' | 'DAMAGED' | 'CONSUMED';
  location_id?: number;
  received_from_spp: string;
}
