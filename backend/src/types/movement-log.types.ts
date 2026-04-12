// Movement Log entity
export interface MovementLog {
  id: number;
  transaction_id: string;
  transaction_date: Date;
  trip_id: string | null;
  document_no: string | null;
  material_id: number | null;
  qty: number | null;
  from_location_id: number | null;
  to_location_id: number | null;
  movement_type_id: number | null;
  vehicle_driver: string | null;
  received_by: string | null;
  loading_time: Date | null;
  unloading_time: Date | null;
  condition_notes: string | null;
  documentation_link: string | null;
  mto_item_id: number | null;
  created_by: number | null;
  created_at: Date;
}

// Extended with relations
export interface MovementLogWithRelations extends MovementLog {
  material?: {
    id: number;
    material_code: string;
    description: string;
    remarks: string;
    unit: string;
    unit_price: number;
    whse: string;
    material_type_id: number | null;
    material_type?: {
      id: number;
      type_name: string;
      description: string;
    };
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
  documents?: Array<{
    id: number;
    file_url: string;
    category: string;
    uploaded_at: Date;
  }>;
  mto_item?: {
    id: number;
    mto_id: number;
    mto_number: string;
    requested_qty: number;
    fulfilled_qty: number;
  };
}

// Create/Update DTO
export interface CreateMovementLogDTO {
  transaction_id: string;
  transaction_date: Date | string;
  trip_id?: string;
  document_no?: string;
  material_id?: number;
  qty?: number;
  from_location_id?: number;
  to_location_id?: number;
  movement_type_id?: number;
  vehicle_driver?: string;
  received_by?: string;
  loading_time?: Date | string;
  unloading_time?: Date | string;
  condition_notes?: string;
  documentation_link?: string;
  mto_item_id?: number;
  created_by?: number;
}

export interface UpdateMovementLogDTO extends Partial<CreateMovementLogDTO> {}

// Query params for filtering
export interface MovementLogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  material_id?: number;
  movement_type_id?: number;
  location_id?: number;
}
