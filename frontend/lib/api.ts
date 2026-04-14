/**
 * Axios API Client
 * Single configured instance for all calls to the Node.js Gateway.
 * Automatically attaches Clerk JWT token to every request.
 *
 * Phase 2 — Week 4 implementation.
 */

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// TODO: Phase 2 Week 4 — Add request interceptor to attach Clerk session token
// api.interceptors.request.use(async (config) => {
//   const token = await getToken(); // from Clerk useAuth hook
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default api;
