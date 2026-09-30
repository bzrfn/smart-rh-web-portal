// src/services/api.ts
import axios from 'axios';

const STORAGE_KEY = 'rrhh_auth';

export const API_BASE_URL =
  import.meta.env?.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.token;

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignorar errores de localStorage
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (
      status === 401 &&
      ['Invalid token', 'Missing token', 'Token inválido', 'Token requerido'].includes(message)
    ) {
      setAuthToken(null);
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export async function ejecutarETL(sources: string[] = []) {
  try {
    const res = await api.post('/etl/ejecutar', { sources });
    return res.data;
  } catch (error: any) {
    console.error('Error ejecutando ETL:', error);
    throw error;
  }
}