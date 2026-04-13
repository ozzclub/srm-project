import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/users/login', { email, password }),
  logout: () => {
    Cookies.remove('token');
    Cookies.remove('user');
  },
  getCurrentUser: () => {
    const userStr = Cookies.get('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// User APIs
export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Material APIs
export const materialApi = {
  getAll: () => api.get('/material'),
  getById: (id: number) => api.get(`/material/${id}`),
  create: (data: any) => api.post('/material', data),
  update: (id: number, data: any) => api.put(`/material/${id}`, data),
  delete: (id: number) => api.delete(`/material/${id}`),
  import: (formData: FormData, mode?: 'insert' | 'replace' | 'skip' | 'smart') => {
    if (mode) {
      formData.append('mode', mode);
    }
    return api.post('/material/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  previewImport: (formData: FormData) =>
    api.post('/material/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  downloadTemplate: () =>
    api.get('/material/template', {
      responseType: 'blob',
    }),
};

// Material Type APIs
export const materialTypeApi = {
  getAll: () => api.get('/material-type'),
  getById: (id: number) => api.get(`/material-type/${id}`),
  create: (data: any) => api.post('/material-type', data),
  update: (id: number, data: any) => api.put(`/material-type/${id}`, data),
  delete: (id: number) => api.delete(`/material-type/${id}`),
};

// Location APIs
export const locationApi = {
  getAll: () => api.get('/locations'),
  getById: (id: number) => api.get(`/locations/${id}`),
  create: (data: any) => api.post('/locations', data),
  update: (id: number, data: any) => api.put(`/locations/${id}`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

// Movement Type APIs
export const movementTypeApi = {
  getAll: () => api.get('/movement-types'),
  getById: (id: number) => api.get(`/movement-types/${id}`),
  create: (data: any) => api.post('/movement-types', data),
  update: (id: number, data: any) => api.put(`/movement-types/${id}`, data),
  delete: (id: number) => api.delete(`/movement-types/${id}`),
};

// Movement Log APIs
export const movementLogApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    date_from?: string;
    date_to?: string;
    material_id?: number;
    movement_type_id?: number;
    location_id?: number;
  }) => api.get('/movement-log', { params }),
  getById: (id: string) => api.get(`/movement-log/${id}`),
  getByTripId: (tripId: string) => api.get(`/movement-log/trip/${tripId}`),
  getByDocumentNo: (documentNo: string) => api.get(`/movement-log/do/${documentNo}`),
  create: (data: any) => api.post('/movement-log', data),
  update: (id: string, data: any) => api.put(`/movement-log/${id}`, data),
  delete: (id: string) => api.delete(`/movement-log/${id}`),
  getDashboard: () => api.get('/movement-log/dashboard'),
};

// Document APIs
export const documentApi = {
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  getByTransactionId: (transactionId: string) =>
    api.get(`/documents/${transactionId}`),
  getById: (id: number) => api.get(`/documents/detail/${id}`),
  delete: (id: number) => api.delete(`/documents/${id}`),
};

// MTO (Material Take Off) APIs
export const mtoApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    project_name?: string;
  }) => api.get('/mto', { params }),
  getById: (id: number) => api.get(`/mto/${id}`),
  create: (data: any) => api.post('/mto', data),
  update: (id: number, data: any) => api.put(`/mto/${id}`, data),
  delete: (id: number) => api.delete(`/mto/${id}`),
  updateStatus: (id: number, status: string) => api.put(`/mto/${id}/status`, { status }),
  getFulfillmentStatus: (id: number) => api.get(`/mto/${id}/fulfillment`),
  addItem: (mtoId: number, itemData: any) => api.post(`/mto/${mtoId}/items`, itemData),
  updateItem: (itemId: number, data: any) => api.put(`/mto/items/${itemId}`, data),
  deleteItem: (itemId: number) => api.delete(`/mto/items/${itemId}`),
};

// Inventory APIs
export const inventoryApi = {
  getAll: (params?: {
    location_id?: number;
    material_id?: number;
    low_stock?: boolean;
  }) => api.get('/inventory', { params }),
  getByLocation: (locationId: number) => api.get(`/inventory/${locationId}`),
  getByMaterial: (materialId: number) => api.get(`/inventory/material/${materialId}`),
  getLowStock: (threshold?: number) => api.get('/inventory/low-stock', { params: { threshold } }),
};

// SPP Request APIs
export const sppApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    requested_by?: string;
  }) => api.get('/spp', { params }),
  getById: (id: number) => api.get(`/spp/${id}`),
  create: (data: any) => api.post('/spp', data),
  update: (id: number, data: any) => api.put(`/spp/${id}`, data),
  delete: (id: number) => api.delete(`/spp/${id}`),
  import: (formData: FormData) =>
    api.post('/spp/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  importPreview: (formData: FormData) =>
    api.post('/spp/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  downloadTemplate: () =>
    api.get('/spp/template', {
      responseType: 'blob',
    }),
  updateStatus: (id: number, status: string) => api.put(`/spp/${id}/status`, { status }),
  approve: (id: number, data: any) => api.post(`/spp/${id}/approve`, data),
  receiveItem: (itemId: number, data: any) => api.post(`/spp/items/${itemId}/receive`, data),
  addItem: (sppId: number, itemData: any) => api.post(`/spp/${sppId}/items`, itemData),
  updateItem: (itemId: number, data: any) => api.put(`/spp/items/${itemId}`, data),
  deleteItem: (itemId: number) => api.delete(`/spp/items/${itemId}`),
  getFulfillment: (id: number) => api.get(`/spp/${id}/fulfillment`),
};

// Inventory APIs (New SPP-based Inventory)
export const inventoryNewApi = {
  getAll: (params?: {
    location_id?: number;
    material_id?: number;
    item_type?: 'TOOL' | 'MATERIAL';
    condition_status?: string;
  }) => api.get('/inventory', { params }),
  getTools: () => api.get('/inventory/tools'),
  getMaterials: () => api.get('/inventory/materials'),
  getById: (id: number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
  getStats: () => api.get('/inventory/stats'),
};

export default api;
