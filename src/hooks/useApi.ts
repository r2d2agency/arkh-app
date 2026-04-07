import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Dashboard
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<{
      churches: { total: number; active: number };
      users: { total: number; active: number };
      services: { total: number };
      ai: { tokens: number; cost: number };
    }>('/api/dashboard'),
  });
}

// Churches
export interface Church {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_name: string | null;
  member_count: number;
  created_at: string;
}

export function useChurches() {
  return useQuery({
    queryKey: ['churches'],
    queryFn: () => api.get<Church[]>('/api/churches'),
  });
}

// Users
export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  church_name: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserData[]>('/api/users'),
  });
}

// Plans
export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  max_members: number;
  max_ai_tokens: number;
  features: string[];
  is_active: boolean;
  church_count: number;
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/api/plans'),
  });
}

// Logs
export interface LogEntry {
  id: string;
  level: string;
  action: string;
  message: string | null;
  user_name: string | null;
  church_name: string | null;
  created_at: string;
}

export function useLogs(level?: string) {
  return useQuery({
    queryKey: ['logs', level],
    queryFn: () => api.get<LogEntry[]>(`/api/logs${level ? `?level=${level}` : ''}`),
  });
}

// AI Providers
export interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  is_active: boolean;
  cost_per_1k_tokens: number;
}

export function useAIProviders() {
  return useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.get<AIProvider[]>('/api/ai/providers'),
  });
}

export function useAIUsage() {
  return useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api.get<{ provider: string; model: string; total_tokens: number; total_cost: number; requests: number }[]>('/api/ai/usage'),
  });
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, unknown>>('/api/settings'),
  });
}
