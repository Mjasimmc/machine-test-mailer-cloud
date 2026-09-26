export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum Permission {
  FORMS_READ = 'forms:read',
  FORMS_CREATE = 'forms:create',
  FORMS_UPDATE = 'forms:update',
  FORMS_DEPLOY = 'forms:deploy',
  FORMS_ROLLBACK = 'forms:rollback',
  SUBMISSIONS_READ = 'submissions:read',
  SUBMISSIONS_EXPORT = 'submissions:export',
  USERS_READ = 'users:read',
  USERS_SUSPEND = 'users:suspend',
  USERS_MANAGE = 'users:manage',
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  tenantId?: string;
  permissions?: string[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserDto;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
}

export interface UpdateProfileDto {
  name?: string;
  email?: string;
}

export const SOCKET_EVENTS = {
  USER_SUSPENDED: 'user:suspended',
  TENANT_NOTIFICATION: 'tenant:notification',
} as const;

export * from './types/form';
