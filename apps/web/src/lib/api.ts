import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api`;
  }
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return 'https://smart-factory-plc-lite-automation.onrender.com/api';
    }
  }
  return '/api';
};

const apiBase = getApiBase();

const api = axios.create({
  baseURL: apiBase,
  timeout: 15000,
});

// Store tokens in memory (not localStorage for security)
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (at: string, rt: string) => {
  accessToken = at;
  refreshToken = rt;
};
export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};
export const getAccessToken = () => accessToken;

// Attach token to every request
api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle 401: try to refresh, then retry
let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && refreshToken) {
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
        const res = await axios.post(`${apiBase}/auth/refresh`, { refreshToken });
        const { accessToken: newAt, refreshToken: newRt } = res.data;
        setTokens(newAt, newRt);
        refreshQueue.forEach(cb => cb(newAt));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newAt}`;
        return api(original);
      } catch {
        clearTokens();
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
