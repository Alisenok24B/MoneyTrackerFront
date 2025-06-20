/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/auth.ts

/**
 * Получает токен из localStorage (если он там есть).
 */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }
  
  /**
   * Декодирует payload JWT.
   */
  export function decodeJWT<T = any>(token: string): T {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT');
    }
    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json) as T;
  }
  
  /**
   * Возвращает id текущего пользователя или null.
   */
  export function getCurrentUserId(): string | null {
    const token = getToken();
    if (!token) return null;
    try {
      const { id } = decodeJWT<{ id: string }>(token);
      return id;
    } catch {
      return null;
    }
  }