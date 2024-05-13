import axios from "axios";

import { getSession } from "next-auth/react";

async function getAccessToken() {
  const session = await getSession();
  return session?.jwt;
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
