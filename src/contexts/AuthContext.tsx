import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  church_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.id, name: payload.name || '', email: payload.email, role: payload.role, church_id: payload.church_id });
        } else {
          // Token expired, try refresh
          api.post<{ access_token: string; refresh_token: string }>('/api/auth/refresh', {
            refresh_token: localStorage.getItem('refresh_token'),
          }).then(data => {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            const p = JSON.parse(atob(data.access_token.split('.')[1]));
            setUser({ id: p.id, name: p.name || '', email: p.email, role: p.role, church_id: p.church_id });
          }).catch(() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          });
        }
      } catch {
        localStorage.removeItem('access_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const u = await api.login(email, password, remember);
    setUser(u);
    return u;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
