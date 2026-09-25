import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // send httpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 → refresh → retry
let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      if (refreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      refreshing = true;

      try {
        const res = await api.post('/auth/refresh');
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setAuth(user, accessToken);
        refreshQueue.forEach((cb) => cb(accessToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Helper to extract standard envelope data
export const extractData = <T>(res: { data: { data: T } }): T => res.data.data;
export const extractMeta = (res: { data: { meta: unknown } }) => res.data.meta;
