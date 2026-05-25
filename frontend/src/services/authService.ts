import { api } from './api';
import type { AuthTokens, User } from '@/types';

export const authService = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ success: boolean; data: AuthTokens }>('/auth/register', data).then(r => r.data.data!),

  login: (data: { email: string; password: string }) =>
    api.post<{ success: boolean; data: AuthTokens }>('/auth/login', data).then(r => r.data.data!),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me').then(r => r.data.data!),

  updateProfile: (data: { name?: string; avatar?: string }) =>
    api.patch<{ success: boolean; data: User }>('/auth/me', data).then(r => r.data.data!),
};
