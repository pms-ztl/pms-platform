// ============================================================================
// API Client — core ApiClient class, singleton instance, and helpers
// ============================================================================

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';
import type { ApiResponse } from './types';

/**
 * Thrown when the API server is unreachable — not running, still starting up,
 * or the Vite dev proxy returns a raw HTML 502/503/504 instead of our JSON.
 * Components and query-client use `error.name === 'ServerUnavailableError'`
 * to suppress error toasts and skip retries for these transient failures.
 */
export class ServerUnavailableError extends Error {
  constructor(message = 'Server is temporarily unavailable. Please try again shortly.') {
    super(message);
    this.name = 'ServerUnavailableError';
  }
}

/**
 * Returns true when the axios error is a connectivity problem rather than a
 * real API-level error.  Our API always responds with `{ success, error? }`.
 * If the body is missing that shape (e.g. Vite proxy HTML error page) or
 * there is no response at all (ECONNREFUSED), it's a connectivity failure.
 */
function isConnectivityFailure(error: AxiosError<ApiResponse<unknown>>): boolean {
  if (!error.response) return true; // ECONNREFUSED / network timeout
  if (error.response.status < 500) return false; // 4xx are real API errors
  const data = error.response.data as unknown;
  // Our API always sends an object with a `success` key.
  // A raw proxy HTML page won't have it → connectivity failure.
  return (
    typeof data !== 'object' ||
    data === null ||
    !('success' in (data as object))
  );
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Get the optimized avatar URL for a given size.
 * For local uploads (/uploads/avatars/{uuid}.webp), appends size suffix.
 * For external URLs (dicebear, etc.), returns as-is.
 *
 * @param avatarUrl - The base avatar URL from the user object
 * @param size - 'sm' (64px), 'md' (160px), 'lg' (320px), or 'original' (800px)
 */
export function getAvatarUrl(avatarUrl: string | undefined | null, size: 'sm' | 'md' | 'lg' | 'original' = 'md'): string | null {
  if (!avatarUrl) return null;

  // External URLs (dicebear, robohash, etc.) — pass through
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // Local uploads: /uploads/avatars/{uuid}.webp → /uploads/avatars/{uuid}-{size}.webp
  if (avatarUrl.startsWith('/uploads/avatars/') && size !== 'original') {
    const ext = avatarUrl.lastIndexOf('.');
    if (ext > 0) {
      return `${avatarUrl.substring(0, ext)}-${size}${avatarUrl.substring(ext)}`;
    }
  }

  return avatarUrl;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // ── Connectivity failures (ECONNREFUSED, proxy HTML 5xx) ───────────
        // Thrown as ServerUnavailableError so callers can distinguish these
        // from real API errors and suppress toasts / skip retries accordingly.
        if (isConnectivityFailure(error)) {
          return Promise.reject(new ServerUnavailableError());
        }

        // ── 401 — try to refresh token ──────────────────────────────────────
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
              const response = await this.client.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
                refreshToken,
              });

              if (response.data.success && response.data.data) {
                useAuthStore.getState().setTokens(
                  response.data.data.accessToken,
                  response.data.data.refreshToken
                );

                // Retry original request
                return this.client(originalRequest);
              }
            }
          } catch {
            // Refresh failed - logout
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }

        // ── All other errors — extract API error message ────────────────────
        const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async getRaw(url: string, config?: AxiosRequestConfig): Promise<string> {
    const response = await this.client.get(url, { ...config, responseType: 'text' });
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async postFormData<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data as T;
  }

  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.client.get(url, { ...config, responseType: 'blob' });
    return response.data;
  }

  async getPaginated<T>(
    url: string,
    params?: Record<string, unknown>
  ): Promise<{ data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const response = await this.client.get<ApiResponse<T[]>>(url, { params });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return {
      data: response.data.data || [],
      meta: response.data.meta as { total: number; page: number; limit: number; totalPages: number },
    };
  }
}

export const api = new ApiClient();
