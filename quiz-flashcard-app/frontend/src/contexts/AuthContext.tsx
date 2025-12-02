import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, AuthResponse } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (credential: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'studyforge_access_token';
const USER_KEY = 'studyforge_user';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        try {
          // Verify the token is still valid
          const response = await authApi.verifyToken(storedToken);
          const userData = response.data.data || response.data;
          setUser(userData as User);
        } catch (error) {
          // Token is invalid, clear storage
          console.warn('Stored token is invalid, clearing auth state');
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credential: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.googleLogin(credential);
      const authData = (response.data.data || response.data) as AuthResponse;

      // Store token and user
      localStorage.setItem(TOKEN_KEY, authData.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
      setUser(authData.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authApi.guestLogin();
      const authData = (response.data.data || response.data) as AuthResponse;

      // Store token and user
      localStorage.setItem(TOKEN_KEY, authData.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
      setUser(authData.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    // Call logout endpoint (fire and forget)
    authApi.logout().catch(() => {});
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  // Check if current user is a guest
  const isGuest = user?.id === -1 || user?.email === 'guest@studyforge.app';

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isGuest,
    isLoading,
    login,
    loginAsGuest,
    logout,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
