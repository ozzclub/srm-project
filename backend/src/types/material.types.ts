// Material Type reference
export interface MaterialType {
  id: number;
  type_name: string;
  description: string;
  created_at: Date;
}

// Material entity
export interface Material {
  id: number;
  material_code: string;
  description: string;
  remarks: string;
  unit: string;
  unit_price: number;
  whse: string;
  material_type_ids: number[];
  material_types?: MaterialType[];
  created_at: Date;
}

// Create/Update DTO
export interface CreateMaterialDTO {
  material_code?: string; // Optional - will be auto-generated if not provided
  description: string;
  remarks?: string;
  unit: string;
  unit_price?: number;
  whse?: string;
  material_type_ids?: number[];
}

export interface UpdateMaterialDTO extends Partial<CreateMaterialDTO> {}
