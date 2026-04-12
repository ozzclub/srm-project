// Material Type entity
export interface MaterialType {
  id: number;
  type_name: string;
  description: string;
  created_at: Date;
}

// Create/Update DTO
export interface CreateMaterialTypeDTO {
  type_name: string;
  description?: string;
}

export interface UpdateMaterialTypeDTO extends Partial<CreateMaterialTypeDTO> {}
