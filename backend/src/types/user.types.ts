// User entity
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'workshop' | 'material_site';
  created_at: Date;
}

// User without password (for responses)
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'workshop' | 'material_site';
  created_at: Date;
}

// JWT Payload
export interface JwtPayload {
  id: number;
  email: string;
  role: 'admin' | 'staff' | 'workshop' | 'material_site';
  iat?: number;
  exp?: number;
}
