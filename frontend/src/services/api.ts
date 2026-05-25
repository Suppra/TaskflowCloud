import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request: adjunta JWT ──────────────────────────────────
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: refresca token si 401 ──────────────────────
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  queue.forEach(cb => cb(token));
  queue = [];
};

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise(resolve => {
        queue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const store = useAuthStore.getState();
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: store.refreshToken,
      });
      const newToken = data.data.accessToken;
      store.setTokens(newToken, data.data.refreshToken);
      processQueue(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
