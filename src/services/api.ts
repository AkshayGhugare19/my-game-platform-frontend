import axios, { AxiosRequestConfig, type AxiosInstance } from "axios";
import type { ApiResponse } from "@/types";
import { isWidgetEmbed } from "@/utils/embed";

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach access token (sessionStorage + expiry).
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  const expiry = sessionStorage.getItem("token_expiry");
  if (token && expiry && Date.now() < Number(expiry)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt one transparent refresh, else clear session.
let refreshing: Promise<boolean> | null = null;

const tryRefresh = async (): Promise<boolean> => {
  const refreshToken = sessionStorage.getItem("refresh_token");
  if (!refreshToken) return false;
  try {
    const res = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const d = res.data?.data;
    if (d?.accessToken) {
      sessionStorage.setItem("token", d.accessToken);
      sessionStorage.setItem(
        "token_expiry",
        String(Date.now() + 14 * 60 * 1000)
      );
      sessionStorage.setItem("refresh_token", d.refreshToken);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
};

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const original = error.config;
    // In a GAMRU widget iframe there is no games-platform session — a 401 is
    // expected (e.g. a game's profile fetch). Never refresh or clear here: the
    // embedded game shares this origin's sessionStorage with the top games tab,
    // so clearing it would log the real user out. Just reject.
    if (isWidgetEmbed()) {
      return Promise.reject(
        error.response?.data ?? { message: "Something went wrong" }
      );
    }
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;
      refreshing = refreshing ?? tryRefresh();
      const okRefresh = await refreshing;
      refreshing = null;
      if (okRefresh) {
        original.headers.Authorization = `Bearer ${sessionStorage.getItem(
          "token"
        )}`;
        return api(original);
      }
      sessionStorage.clear();
    }
    return Promise.reject(
      error.response?.data ?? { message: "Something went wrong" }
    );
  }
);

const apiService = {
  get: <T = unknown>(
    url: string,
    params?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    api.get(url, { params, ...config }) as unknown as Promise<ApiResponse<T>>,
  post: <T = unknown>(
    url: string,
    payload: unknown = {},
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    api.post(url, payload, config) as unknown as Promise<ApiResponse<T>>,
  put: <T = unknown>(
    url: string,
    payload: unknown = {},
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    api.put(url, payload, config) as unknown as Promise<ApiResponse<T>>,
  patch: <T = unknown>(
    url: string,
    payload: unknown = {},
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    api.patch(url, payload, config) as unknown as Promise<ApiResponse<T>>,
  delete: <T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> =>
    api.delete(url, config) as unknown as Promise<ApiResponse<T>>,
};

export default apiService;
