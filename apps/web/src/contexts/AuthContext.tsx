import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api, { setTokens, clearTokens } from '../lib/api';

interface User {
  _id: string;
  email: string;
  role: 'VIEWER' | 'OPERATOR' | 'ENGINEER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Try stored refresh token on load
    const rt = sessionStorage.getItem('sf_rt');
    if (rt) {
      api.post('/auth/refresh', { refreshToken: rt })
        .then(res => {
          setTokens(res.data.accessToken, res.data.refreshToken);
          sessionStorage.setItem('sf_rt', res.data.refreshToken);
          return fetchMe();
        })
        .catch(() => { sessionStorage.removeItem('sf_rt'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setTokens(res.data.accessToken, res.data.refreshToken);
    sessionStorage.setItem('sf_rt', res.data.refreshToken);
    await fetchMe();
  };

  const register = async (email: string, password: string) => {
    await api.post('/auth/register', { email, password });
    await login(email, password);
  };

  const logout = async () => {
    const rt = sessionStorage.getItem('sf_rt');
    try { await api.post('/auth/logout', { refreshToken: rt }); } catch {}
    clearTokens();
    sessionStorage.removeItem('sf_rt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
