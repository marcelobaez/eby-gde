/**
 * Axios instance configuration with session token caching and 401 error handling
 *
 * Features:
 * - Caches session token using actual Azure token expiration time
 * - Prevents multiple simultaneous getSession calls with pending promise cache
 * - Automatically handles 401 errors by clearing cache and redirecting to login
 * - Provides clearTokenCache() function for manual cache clearing
 */

import axios from "axios";
import { getSession, signOut } from "next-auth/react";

// Cache for the session token to avoid multiple getSession calls
let tokenCache: string | null = null;
let tokenExpiry: number | null = null;

// Pending promise cache to prevent multiple simultaneous getSession calls
let pendingTokenPromise: Promise<string | null> | null = null;

// Debug flag - set to true to see getSession calls in console
const DEBUG_GET_SESSION = false;

async function getAccessToken(): Promise<string | null> {
  const now = Date.now();

  // Return cached token if it's still valid
  if (tokenCache && tokenExpiry && now < tokenExpiry) {
    if (DEBUG_GET_SESSION) {
      console.log(
        "🔒 Using cached token (expires:",
        new Date(tokenExpiry).toLocaleTimeString(),
        ")"
      );
    }
    return tokenCache;
  }

  // If there's already a pending request, wait for it
  if (pendingTokenPromise) {
    if (DEBUG_GET_SESSION) {
      console.log("⏳ Waiting for pending getSession call...");
    }
    return await pendingTokenPromise;
  }

  if (DEBUG_GET_SESSION) {
    console.log("🔄 Calling getSession()...");
  }

  // Create a new promise for getting the session
  pendingTokenPromise = (async (): Promise<string | null> => {
    try {
      // Get fresh session
      const session = await getSession();
      const token = session?.jwt;

      if (token && session?.azureTokenExpires) {
        // Cache the token with actual Azure token expiration
        tokenCache = token;
        tokenExpiry = session.azureTokenExpires;
        if (DEBUG_GET_SESSION) {
          console.log(
            "✅ Token cached until:",
            new Date(session.azureTokenExpires).toLocaleTimeString()
          );
        }
      } else {
        // Clear cache if no token or no expiration
        tokenCache = null;
        tokenExpiry = null;
        if (DEBUG_GET_SESSION) {
          console.log("❌ No token or expiration found");
        }
      }

      return token || null;
    } finally {
      // Clear the pending promise
      pendingTokenPromise = null;
    }
  })();

  return await pendingTokenPromise;
}

// Clear token cache (useful for logout)
export function clearTokenCache() {
  if (DEBUG_GET_SESSION) {
    console.log("🗑️ Clearing token cache");
  }
  tokenCache = null;
  tokenExpiry = null;
  pendingTokenPromise = null;
}

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log("axios error", error);
    if (error.response?.status === 401) {
      // Clear the token cache
      clearTokenCache();

      // Sign out the user and redirect to login
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    }

    return Promise.reject(error);
  }
);
