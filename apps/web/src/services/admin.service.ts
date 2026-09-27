import { api } from './api';
import { DashboardStats, UserDto } from '@saas/shared';

export const adminService = {
  getStats: async (): Promise<DashboardStats> => {
    return api.get<DashboardStats>('/admin/dashboard/stats');
  },

  getUsers: async (search?: string): Promise<UserDto[]> => {
    const trimmed = search?.trim();
    const query = trimmed ? `?search=${encodeURIComponent(trimmed)}` : '';
    return api.get<UserDto[]>(`/admin/users${query}`);
  },

  getUserById: async (id: string): Promise<UserDto> => {
    return api.get<UserDto>(`/admin/users/${id}`);
  },

  suspendUser: async (id: string): Promise<UserDto> => {
    return api.patch<UserDto>(`/admin/users/${id}/suspend`);
  },

  unsuspendUser: async (id: string): Promise<UserDto> => {
    return api.patch<UserDto>(`/admin/users/${id}/unsuspend`);
  },
};
