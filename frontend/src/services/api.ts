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
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('vs_refresh_token');

      if (refreshToken) {
        try {
          // Send refresh token to get a new access token
          const baseURL = (import.meta.env.VITE_API_URL as string) || '/api';
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          if (data?.data?.token) {
            localStorage.setItem('vs_token', data.data.token);
            originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
            return api(originalRequest); // Retry the original request
          }
        } catch (refreshError) {
          // Refresh token failed (expired/invalid)
          localStorage.removeItem('vs_token');
          localStorage.removeItem('vs_refresh_token');
          // Dispatch a custom event to force a logout in the frontend
          window.dispatchEvent(new CustomEvent('auth:force-logout'));
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, force logout
        localStorage.removeItem('vs_token');
        localStorage.removeItem('vs_refresh_token');
        window.dispatchEvent(new CustomEvent('auth:force-logout'));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
