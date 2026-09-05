import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === 'QUOTA_EXPIRED') {
      window.dispatchEvent(new CustomEvent('open-vip-modal', { detail: error.response.data }));
    }
    return Promise.reject(error);
  }
);

export default api;
