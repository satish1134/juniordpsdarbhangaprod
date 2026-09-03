import axios from "axios";
import {
  TOKEN_KEY,
  initAdminSession,
  clearAdminSession,
  recordAdminActivity,
  isSessionExpired,
} from "./sessionManager";

const BACKEND_URL = (typeof process !== "undefined" && process?.env?.REACT_APP_BACKEND_URL) || (typeof import.meta !== "undefined" && import.meta?.env?.VITE_BACKEND_URL) || "";
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

// Cookies are sent automatically with every request via withCredentials
const api = axios.create({ baseURL: API, withCredentials: true });

// Attach Authorization Bearer header if token exists (crucial for iframe / sandboxed environments)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const url = config.url || "";
    const isLoginReq = url.includes("/admin/login");

    // Check inactivity timeout on API calls
    if (!isLoginReq && isSessionExpired()) {
      clearAdminSession();
    } else if (!isLoginReq) {
      recordAdminActivity(false);
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // If an API request returns an HTML string (e.g. static host fallback like Vercel rewrites), reject as invalid API response
    if (typeof response.data === "string" && (response.data.trim().startsWith("<!") || response.data.trim().startsWith("<html") || response.headers?.["content-type"]?.includes("text/html"))) {
      const error = new Error("Invalid API response format (HTML received instead of JSON)");
      error.response = response;
      return Promise.reject(error);
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      // If unauthorized on protected route, clear stale token
      const url = error.config?.url || "";
      if (url !== "/admin/login") {
        clearAdminSession();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// public helpers
export const submitEnquiry = (payload) => api.post("/enquiries", payload);
export const fetchNews = () => api.get("/news");
export const fetchContent = () => api.get("/content");

// admin
export const adminLogin = async (username, password, otp) => {
  const res = await api.post("/admin/login", { username, password, otp });
  if (res.data?.token && typeof window !== "undefined") {
    initAdminSession(res.data.token, res.data.username || username);
  }
  return res;
};

export const adminLogout = async () => {
  clearAdminSession();
  try {
    return await api.post("/admin/logout");
  } catch {
    return { data: { ok: true } };
  }
};

export const adminMe = () => api.get("/admin/me");
export const twofaStatus = () => api.get("/admin/2fa/status");
export const twofaSetup = () => api.post("/admin/2fa/setup");
export const twofaEnable = (code) => api.post("/admin/2fa/enable", { code });
export const twofaDisable = (code) => api.post("/admin/2fa/disable", { code });
export const changeAdminPassword = (current_password, new_password) => api.post("/admin/password/change", { current_password, new_password });
export const fetchAuditLog = ({ limit = 100, skip = 0, action } = {}) => api.get("/audit-log", { params: { limit, skip, ...(action ? { action } : {}) } });
export const listEnquiries = () => api.get("/enquiries");
export const updateEnquiryStatus = (id, status) => api.patch(`/enquiries/${id}`, { status });
export const deleteEnquiry = (id) => api.delete(`/enquiries/${id}`);
export const listAllNews = () => api.get("/news/all");
export const createNews = (payload) => api.post("/news", payload);
export const updateNews = (id, payload) => api.put(`/news/${id}`, payload);
export const deleteNews = (id) => api.delete(`/news/${id}`);
export const updateContent = (section, data) => api.put(`/content/${section}`, { data });
export const resetContent = (section) => api.post(`/content/${section}/reset`);
export const sendTestEnquiryEmail = () => api.post("/enquiries/test-email");
export const fetchDbStatus = () => api.get("/db-status");

export const resolveImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("/api") ? trimmed : `${API}${trimmed}`;
  }
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    return `${API}/images/${trimmed}`;
  }
  return trimmed;
};
