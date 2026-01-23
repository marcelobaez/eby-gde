/**
 * API Helper Utilities
 * 
 * Provides clean, type-safe functions for making API calls to internal
 * Next.js API routes. These helpers ensure session validity and provide
 * consistent error handling.
 * 
 * Features:
 * - Validates session before making calls
 * - Consistent error handling
 * - Type-safe responses
 * - Supports all HTTP methods
 * - Special helper for file downloads
 * 
 * Usage:
 * ```tsx
 * import { apiGet, apiPost, downloadFile } from '@/lib/apiHelpers';
 * 
 * // GET request
 * const data = await apiGet('/api/gdeexps', { params: { expIds } });
 * 
 * // POST request
 * const result = await apiPost('/api/search-logs', { query: 'test' });
 * 
 * // Download file
 * await downloadFile('/api/documents?id=123', 'document.pdf');
 * ```
 */

import axios, { AxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react";

/**
 * Check if user has a valid session
 * If not, sign out and redirect to login
 */
async function ensureValidSession(): Promise<void> {
  const session = await getSession();
  
  if (!session) {
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
    throw new Error("No valid session");
  }

  // Check if Azure token has expired
  if (session.azureTokenExpires && Date.now() >= session.azureTokenExpires) {
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
    throw new Error("Session expired");
  }
}

/**
 * Generic API call function
 * @param url - API endpoint URL
 * @param options - Axios request config
 * @returns Response data
 */
export async function apiCall<T = any>(
  url: string,
  options?: AxiosRequestConfig
): Promise<T> {
  await ensureValidSession();

  try {
    const response = await axios<T>(url, options);
    return response.data;
  } catch (error: any) {
    // If we get a 401, the middleware or API route rejected us
    if (error.response?.status === 401) {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    }
    throw error;
  }
}

/**
 * Make a GET request to an API endpoint
 * @param url - API endpoint URL
 * @param options - Axios request config
 * @returns Response data
 */
export async function apiGet<T = any>(
  url: string,
  options?: AxiosRequestConfig
): Promise<T> {
  return apiCall<T>(url, { ...options, method: "GET" });
}

/**
 * Make a POST request to an API endpoint
 * @param url - API endpoint URL
 * @param data - Request body data
 * @param options - Axios request config
 * @returns Response data
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  options?: AxiosRequestConfig
): Promise<T> {
  return apiCall<T>(url, { ...options, method: "POST", data });
}

/**
 * Make a PUT request to an API endpoint
 * @param url - API endpoint URL
 * @param data - Request body data
 * @param options - Axios request config
 * @returns Response data
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  options?: AxiosRequestConfig
): Promise<T> {
  return apiCall<T>(url, { ...options, method: "PUT", data });
}

/**
 * Make a DELETE request to an API endpoint
 * @param url - API endpoint URL
 * @param options - Axios request config
 * @returns Response data
 */
export async function apiDelete<T = any>(
  url: string,
  options?: AxiosRequestConfig
): Promise<T> {
  return apiCall<T>(url, { ...options, method: "DELETE" });
}

/**
 * Download a file from an API endpoint
 * @param url - API endpoint URL
 * @param filename - Name to save the file as
 * @param options - Fetch options
 */
export async function downloadFile(
  url: string,
  filename: string,
  options?: RequestInit
): Promise<void> {
  await ensureValidSession();

  try {
    const response = await fetch(url, {
      ...options,
      method: options?.method || "GET",
    });

    if (response.status === 401) {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      throw error;
    }
    console.error("File download error:", error);
    throw error;
  }
}
