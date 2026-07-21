import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// --- auth-storage helpers (avoids circular import with authStore) ---
const readAuth = () => {
  try { return JSON.parse(localStorage.getItem('auth-storage') || 'null'); }
  catch { return null; }
};
const writeTokens = ({ token, refreshToken }) => {
  const parsed = readAuth() || { state: {}, version: 0 };
  parsed.state = parsed.state || {};
  if (token) parsed.state.token = token;
  if (refreshToken) parsed.state.refreshToken = refreshToken;
  localStorage.setItem('auth-storage', JSON.stringify(parsed));
};
const clearAuth = () => localStorage.removeItem('auth-storage');

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    try {
      const parsedAuth = readAuth();
      const token = parsedAuth?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      console.error("Could not parse auth state");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- silent refresh handling (single-flight) ---
let isRefreshing = false;
let refreshWaiters = [];
const onRefreshed = (token) => { refreshWaiters.forEach((cb) => cb(token)); refreshWaiters = []; };

const refreshAccessToken = async () => {
  const parsed = readAuth();
  const refreshToken = parsed?.state?.refreshToken;
  if (!refreshToken) throw new Error('No refresh token');
  // Bare axios call to avoid interceptor recursion
  const res = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { withCredentials: true }
  );
  const data = res.data?.data || res.data;
  writeTokens({ token: data.token, refreshToken: data.refreshToken });
  return data.token;
};

// RESPONSE INTERCEPTOR — Normalize success + auto-refresh on 401
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.status === 'success' && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh') || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password');

    if (status === 401 && !original._retry && !isAuthEndpoint && readAuth()?.state?.refreshToken) {
      original._retry = true;
      try {
        if (isRefreshing) {
          const newToken = await new Promise((resolve) => refreshWaiters.push(resolve));
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        isRefreshing = false;
        refreshWaiters = [];
        clearAuth();
        if (window.location.pathname !== "/login") window.location.href = "/login";
        return Promise.reject({ message: 'Session expired. Please sign in again.', status: 401 });
      }
    }

    if (status === 401 && !isAuthEndpoint) {
      // Only bounce to login if the user HAD a session (expired token).
      // Guests hitting auth-only helper endpoints (e.g. canReview) must not be redirected.
      if (readAuth()?.state?.token) {
        clearAuth();
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }
    }

    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Network Error. Please try again.";
    return Promise.reject({
      message: errorMessage,
      status,
      data: error.response?.data,
    });
  }
);

export default api;
