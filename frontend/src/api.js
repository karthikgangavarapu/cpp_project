import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('menumix_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('menumix_token');
      localStorage.removeItem('menumix_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);

// Public
export const getLanguages = () => api.get('/languages');
export const getRestaurants = () => api.get('/restaurants');
export const getRestaurant = (id) => api.get(`/restaurants/${id}`);
export const getDishes = (restId) => api.get(`/restaurants/${restId}/dishes`);
export const translateDish = (dishId, lang) => api.get(`/dishes/${dishId}/translate`, { params: { lang } });
export const speakDish = (dishId, lang) => api.get(`/dishes/${dishId}/speak`, { params: { lang } });

// Admin
export const createRestaurant = (data) => api.post('/restaurants', data);
export const updateRestaurant = (id, data) => api.put(`/restaurants/${id}`, data);
export const deleteRestaurant = (id) => api.delete(`/restaurants/${id}`);
export const createDish = (restId, data) => api.post(`/restaurants/${restId}/dishes`, data);
export const updateDish = (id, data) => api.put(`/dishes/${id}`, data);
export const deleteDish = (id) => api.delete(`/dishes/${id}`);

export default api;
