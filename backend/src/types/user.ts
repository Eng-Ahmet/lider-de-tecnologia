export type UserRole = 'User' | 'Administrator';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface AuthResponse {
  user: SafeUser;
  token: string;
}
