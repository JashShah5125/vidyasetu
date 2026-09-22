import axios from 'axios';

// The base URL relies on the Vite proxy configured in vite.config.ts, or an environment variable in production
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vs_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Ignore 401 handling on auth endpoints (login, refresh, logout) to prevent infinite loops
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('vs_refresh_token');

      if (refreshToken) {
        try {
          const baseURL = (import.meta.env.VITE_API_URL as string) || '/api';
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          if (data?.data?.token) {
            const newToken = data.data.token;
            localStorage.setItem('vs_token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            isRefreshing = false;
            return api(originalRequest);
          } else {
            throw new Error('No access token returned from refresh');
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('vs_token');
          localStorage.removeItem('vs_refresh_token');
          window.dispatchEvent(new CustomEvent('auth:force-logout'));
          isRefreshing = false;
          return Promise.reject(refreshError);
        }
      } else {
        processQueue(error, null);
        localStorage.removeItem('vs_token');
        localStorage.removeItem('vs_refresh_token');
        window.dispatchEvent(new CustomEvent('auth:force-logout'));
        isRefreshing = false;
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

