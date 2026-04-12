// Movement Type entity
export interface MovementType {
  id: number;
  name: string;
}

// Create/Update DTO
export interface CreateMovementTypeDTO {
  name: string;
}

export interface UpdateMovementTypeDTO extends Partial<CreateMovementTypeDTO> {}
