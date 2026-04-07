import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ── Dashboard ──
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

// ── Churches ──
export interface Church {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_id: string | null;
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

export function useCreateChurch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; plan_id?: string; status?: string }) =>
      api.post<Church>('/api/churches', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['churches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Igreja criada'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateChurch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; slug?: string; plan_id?: string; status?: string }) =>
      api.put<Church>(`/api/churches/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['churches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Igreja atualizada'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteChurch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/churches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['churches'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Igreja removida'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Users ──
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

export function useToggleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<{ id: string; is_active: boolean }>(`/api/users/${id}/toggle`, {}),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(data.is_active ? 'Usuário ativado' : 'Usuário bloqueado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Plans ──
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

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; price: number; interval: string; max_members: number; max_ai_tokens: number; features: string[] }) =>
      api.post<Plan>('/api/plans', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success('Plano criado'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; price?: number; interval?: string; max_members?: number; max_ai_tokens?: number; features?: string[]; is_active?: boolean }) =>
      api.put<Plan>(`/api/plans/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success('Plano atualizado'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Logs ──
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

// ── AI ──
export interface AIProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  is_active: boolean;
  cost_per_1k_tokens: number;
  api_keys?: string[];
  api_key_count?: number;
}

export function useAIProviders() {
  return useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.get<AIProvider[]>('/api/ai/providers'),
  });
}

export function useCreateAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; provider: string; model: string; api_keys: string[]; is_active: boolean; cost_per_1k_tokens: number }) =>
      api.post<AIProvider>('/api/ai/providers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-providers'] }); toast.success('Provedor criado'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; provider?: string; model?: string; api_keys?: string[]; is_active?: boolean; cost_per_1k_tokens?: number }) =>
      api.put<AIProvider>(`/api/ai/providers/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-providers'] }); toast.success('Provedor atualizado'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/ai/providers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-providers'] }); toast.success('Provedor removido'); },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleAIProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<AIProvider>(`/api/ai/providers/${id}/toggle`, {}),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success(data.is_active ? 'Provedor ativado' : 'Provedor desativado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAIUsage() {
  return useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api.get<{ provider: string; model: string; total_tokens: number; total_cost: number; requests: number }[]>('/api/ai/usage'),
  });
}

// ── Settings ──
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, unknown>>('/api/settings'),
  });
}
