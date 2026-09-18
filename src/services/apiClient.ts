/**
 * Centralized API Client for Smart Market POS
 * Handles authentication headers, safe JSON parsing, and standard error handling.
 */

export interface ApiErrorResponse {
  code?: string;
  message: string;
  messageAr?: string;
  details?: any;
}

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public messageAr: string;
  public details?: any;

  constructor(statusCode: number, errorData: Partial<ApiErrorResponse>) {
    const msg = errorData.message || 'API request failed';
    super(msg);
    this.statusCode = statusCode;
    this.code = errorData.code || 'API_ERROR';
    this.messageAr = errorData.messageAr || msg;
    this.details = errorData.details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const TOKEN_KEY = 'pos_auth_token';
let onAuthExpiredCallback: (() => void) | null = null;

// Migrate from localStorage to sessionStorage once on startup
function migrateStorageOnce(): void {
  try {
    if (typeof window !== 'undefined') {
      const oldToken = localStorage.getItem(TOKEN_KEY);
      if (oldToken) {
        if (!sessionStorage.getItem(TOKEN_KEY)) {
          sessionStorage.setItem(TOKEN_KEY, oldToken);
        }
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

migrateStorageOnce();

export const authStorage = {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {}
    } catch {
      // Storage unavailable
    }
  },
  clearToken(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {}
    } catch {
      // Storage unavailable
    }
  },
  onAuthExpired(callback: () => void): void {
    onAuthExpiredCallback = callback;
  },
};

export function generateOperationId(prefix: string = 'op'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = authStorage.getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.idempotencyKey) {
    headers.set('x-idempotency-key', options.idempotencyKey);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Network connection error or server offline',
      messageAr: 'فشل الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت',
    });
  }

  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    // Non-JSON response (e.g., HTML from proxy or crash)
    const text = await response.text();
    if (!response.ok) {
      throw new ApiError(response.status, {
        code: 'NON_JSON_RESPONSE',
        message: `Server returned unexpected response (${response.status})`,
        messageAr: 'استجاب الخادم ببيانات غير متوقعة، يرجى مراجعة حالة النظام',
        details: text.slice(0, 200),
      });
    }
    return text as unknown as T;
  }

  if (!response.ok) {
    // 401 Unauthorized -> session expired
    if (response.status === 401) {
      authStorage.clearToken();
      if (onAuthExpiredCallback) {
        onAuthExpiredCallback();
      }
    }

    const errObj = responseData?.error || responseData || {};
    throw new ApiError(response.status, {
      code: errObj.code || `HTTP_${response.status}`,
      message: errObj.message || responseData?.message || responseData?.messageEn || 'Request failed',
      messageAr: errObj.messageAr || responseData?.messageAr || 'حدث خطأ أثناء معالجة الطلب',
      details: errObj.details,
    });
  }

  // If response has { success: true, data: ... } extract data, or return as-is
  if (responseData && typeof responseData === 'object' && 'data' in responseData && responseData.success === true) {
    return responseData.data as T;
  }

  return responseData as T;
}

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
