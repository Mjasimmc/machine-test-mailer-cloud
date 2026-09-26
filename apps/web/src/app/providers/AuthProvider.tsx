import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthResponse, LoginDto, RegisterDto, UserDto, UserStatus } from '@saas/shared';
import { authService } from '../../services/auth.service';
import { setAccessToken } from '../../services/api';

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<AuthResponse>;
  register: (data: RegisterDto) => Promise<AuthResponse>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<UserDto>;
  logout: () => Promise<void>;
  handleSuspended: (userEmail?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const userRef = useRef<UserDto | null>(null);
  userRef.current = user;

  const handleSuspended = useCallback(
    (userEmail?: string) => {
      const emailToPersist =
        userEmail ||
        userRef.current?.email ||
        localStorage.getItem('last_user_email') ||
        '';
      if (emailToPersist) {
        sessionStorage.setItem('suspended_email', emailToPersist);
      }
      setAccessToken(null);
      setToken(null);
      setUser(null);
      navigate('/account-suspended', { replace: true });
    },
    [navigate],
  );

  // Initialize and validate session on mount via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // Attempt session reconstruction using the browser's HttpOnly refresh cookie
        const refreshRes = await authService.refreshToken();
        if (!isMounted) return;

        setToken(refreshRes.accessToken);
        const profile = await authService.getProfile();
        if (!isMounted) return;

        if (profile.status === UserStatus.SUSPENDED) {
          handleSuspended(profile.email);
          return;
        }

        setUser(profile);
        if (profile.email) {
          localStorage.setItem('last_user_email', profile.email);
        }
      } catch {
        // Not logged in or session expired
        if (isMounted) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Listen for custom events dispatched by API client
    const onSuspended = () => {
      handleSuspended();
    };

    const onTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>;
      if (customEvent.detail?.token) {
        setToken(customEvent.detail.token);
      }
    };

    const onAuthFailure = () => {
      setAccessToken(null);
      setToken(null);
      setUser(null);
      // Navigate explicitly so the redirect is immediate rather than waiting
      // for ProtectedRoute to catch the cleared token on its next render.
      navigate('/login', { replace: true });
    };

    window.addEventListener('saas:account-suspended', onSuspended);
    window.addEventListener('saas:token-refreshed', onTokenRefreshed);
    window.addEventListener('saas:auth-failure', onAuthFailure);

    return () => {
      isMounted = false;
      window.removeEventListener('saas:account-suspended', onSuspended);
      window.removeEventListener('saas:token-refreshed', onTokenRefreshed);
      window.removeEventListener('saas:auth-failure', onAuthFailure);
    };
  }, [handleSuspended]);

  const login = async (credentials: LoginDto): Promise<AuthResponse> => {
    const res = await authService.login(credentials);
    setToken(res.accessToken);
    setUser(res.user);
    if (res.user?.email) {
      localStorage.setItem('last_user_email', res.user.email);
    }
    return res;
  };

  const register = async (data: RegisterDto): Promise<AuthResponse> => {
    const res = await authService.register(data);
    setToken(res.accessToken);
    setUser(res.user);
    if (res.user?.email) {
      localStorage.setItem('last_user_email', res.user.email);
    }
    return res;
  };

  const updateProfile = async (data: { name?: string; email?: string }): Promise<UserDto> => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    if (updated.email) {
      localStorage.setItem('last_user_email', updated.email);
    }
    return updated;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ensure client state is wiped even if server request fails
    }
    setAccessToken(null);
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        updateProfile,
        logout,
        handleSuspended,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
