// Location entity
export interface Location {
  id: number;
  location_name: string;
  location_type: 'warehouse' | 'workshop' | 'site';
  created_at: Date;
}

// Create/Update DTO
export interface CreateLocationDTO {
  location_name: string;
  location_type: 'warehouse' | 'workshop' | 'site';
}

export interface UpdateLocationDTO extends Partial<CreateLocationDTO> {}
