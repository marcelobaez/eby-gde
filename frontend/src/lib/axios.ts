/**
 * Axios instance configuration for Strapi API
 *
 * Features:
 * - Automatically injects JWT token from NextAuth session
 * - Handles 401 errors by signing out and redirecting to login
 * - Simplified approach - no token caching (NextAuth handles it efficiently)
 */

import axios from "axios";
import { getSession, signOut } from "next-auth/react";

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

// Request interceptor: Add JWT token to all requests
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.jwt) {
    config.headers.Authorization = `Bearer ${session.jwt}`;
  }
  return config;
});

// Response interceptor: Handle 401 errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log("axios error", error);
    if (error.response?.status === 401) {
      // Sign out the user and redirect to login
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    }

    return Promise.reject(error);
  }
);
