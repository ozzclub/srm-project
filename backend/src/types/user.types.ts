// User entity
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
  created_at: Date;
}

// User without password (for responses)
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: Date;
}

// JWT Payload
export interface JwtPayload {
  id: number;
  email: string;
  role: 'admin' | 'staff';
  iat?: number;
  exp?: number;
}
