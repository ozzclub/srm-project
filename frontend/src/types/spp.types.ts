// SPP Request types for frontend

export interface SPPRequest {
  id: number;
  spp_number: string;
  request_date: string;
  requested_by: string;
  created_by_role: 'site' | 'workshop';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface SPPItem {
  id: number;
  spp_id: number;
  material_id: number | null;
  list_item_number: number;
  list_item: string;
  description: string;
  remarks?: string | null;
  unit: string;
  request_qty: number;
  receive_qty: number;
  remaining_qty: number;
  request_status: 'PENDING' | 'PARTIAL' | 'FULFILLED';
  date_req: string;
  item_type: 'TOOL' | 'MATERIAL';
  item_status: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION' | 'RECEIVED';
  delivery_status: 'NOT_SENT' | 'SENT' | 'VERIFIED' | 'REJECTED';
  verified_by?: number | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
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

export interface SPPRequestWithItems extends SPPRequest {
  items: SPPItem[];
  fulfillment_percentage: number;
  total_items: number;
  completed_items: number;
  approvals?: SPPApproval[];
}

export interface SPPApproval {
  id: number;
  spp_id: number;
  approved_by: number;
  approval_role: 'site' | 'workshop' | 'material_site';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approval_notes: string | null;
  approved_at: string;
  created_at: string;
  approved_by_name?: string;
}

export interface Inventory {
  id: number;
  spp_item_id: number;
  spp_request_id?: number;
  material_id: number | null;
  item_type: 'TOOL' | 'MATERIAL';
  list_item?: string;
  description?: string;
  unit?: string;
  quantity: number;
  condition_status: 'GOOD' | 'DAMAGED' | 'CONSUMED';
  location_id: number | null;
  received_from_spp: string;
  spp_number?: string;
  received_at: string;
  created_at: string;
  material_code?: string;
  material_description?: string;
  location_name?: string;
}

export interface CreateSPPRequestDTO {
  spp_number?: string;
  request_date: string;
  requested_by: string;
  created_by_role?: 'site' | 'workshop';
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

export interface UpdateSPPRequestDTO {
  request_date?: string;
  requested_by?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface CreateSPPItemDTO {
  material_id?: number;
  list_item_number?: number;
  list_item: string;
  description: string;
  remarks?: string;
  unit: string;
  request_qty: number;
  date_req: string;
  item_type?: 'TOOL' | 'MATERIAL';
}

export interface UpdateSPPItemDTO {
  material_id?: number;
  list_item?: string;
  description?: string;
  remarks?: string;
  unit?: string;
  request_qty?: number;
  receive_qty?: number;
  date_req?: string;
  item_type?: 'TOOL' | 'MATERIAL';
  item_status?: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION' | 'RECEIVED';
  delivery_status?: 'NOT_SENT' | 'SENT' | 'VERIFIED' | 'REJECTED';
}

export interface ApproveSPPDTO {
  approval_role: 'site' | 'workshop' | 'material_site';
  approval_status: 'APPROVED' | 'REJECTED';
  approval_notes?: string;
}

export interface ReceiveSPPItemDTO {
  receive_qty: number;
  item_status?: 'IN_TRANSIT' | 'RECEIVED';
}

export interface UpdateDeliveryDTO {
  receive_qty?: number;
  delivery_status?: 'NOT_SENT' | 'SENT';
  item_status?: 'PENDING' | 'IN_TRANSIT' | 'PENDING_VERIFICATION';
}

export interface SiteApproveDTO {
  approval_status: 'APPROVED' | 'REJECTED';
  approval_notes?: string;
  items?: {
    item_id: number;
    receive_qty: number;
  }[];
}

export interface VerifyDeliveryDTO {
  action: 'VERIFY' | 'REJECT' | 'ADJUST';
  actual_qty?: number;
  rejection_reason?: string;
  notes?: string;
}

export interface DirectReceiveDTO {
  receive_qty: number;
  notes?: string;
}

export interface SPPQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  requested_by?: string;
}

export interface InventoryQueryParams {
  location_id?: number;
  material_id?: number;
  item_type?: 'TOOL' | 'MATERIAL';
  condition_status?: string;
}
