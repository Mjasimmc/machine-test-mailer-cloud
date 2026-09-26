import { api, setAccessToken, getOrStartRefresh } from './api';
import { AuthResponse, LoginDto, RegisterDto, UpdateProfileDto, UserDto } from '@saas/shared';

export const authService = {
  login: async (credentials: LoginDto): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    if (res?.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },

  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    if (res?.accessToken) {
      setAccessToken(res.accessToken);
    }
    return res;
  },

  // IMPORTANT: goes through the shared single-flight coordinator so that
  // concurrent mount/initAuth() calls (React StrictMode, HMR re-mounts,
  // fast page restores) never send more than one /auth/refresh request at a
  // time with the same HttpOnly cookie — which would trigger reuse detection
  // and revoke the entire refresh-token family, logging the user out.
  refreshToken: async (): Promise<{ accessToken: string }> => {
    const newToken = await getOrStartRefresh();
    if (!newToken) {
      throw new Error('Session expired. Please log in again.');
    }
    return { accessToken: newToken };
  },

  logout: async (): Promise<{ message: string }> => {
    try {
      return await api.post<{ message: string }>('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  getProfile: async (): Promise<UserDto> => {
    return api.get<UserDto>('/users/me');
  },

  updateProfile: async (data: UpdateProfileDto): Promise<UserDto> => {
    return api.patch<UserDto>('/users/me', data);
  },
};

