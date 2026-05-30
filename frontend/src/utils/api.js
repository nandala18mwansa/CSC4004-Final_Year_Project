import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const tokensRaw = localStorage.getItem('authTokens');
    if (tokensRaw) {
      try {
        const tokens = JSON.parse(tokensRaw);
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
        }
      } catch (e) {
        console.error('Failed to parse auth tokens', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url.includes('token/')
    ) {
      originalRequest._retry = true;

      try {
        const tokensRaw = localStorage.getItem('authTokens');
        if (tokensRaw) {
          const tokens = JSON.parse(tokensRaw);
          const refreshResponse = await axios.post(
            `${baseURL}token/refresh/`,
            { refresh: tokens.refresh }
          );

          const newTokens = {
            ...tokens,
            access: refreshResponse.data.access,
          };
          localStorage.setItem('authTokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('authTokens');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
