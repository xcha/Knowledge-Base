import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

/**
 * 封装 Axios 实例：自动挂载 token、统一错误处理、自动刷新
 * 所有 API 方法都通过这个实例发请求
 */
const request = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  timeout: 30000,
});

// 是否正在刷新 token
let isRefreshing = false;
// 等待刷新的请求队列
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// ---- 请求拦截：自动带 JWT ----
request.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 响应拦截：401 自动刷新 ----
request.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // 如果是 401 且不是刷新请求本身，且没有重试过
    if (
      err.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      typeof window !== "undefined"
    ) {
      // 如果正在刷新，等待刷新完成后重试
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(request(originalRequest));
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        // 从 zustand persist 存储中获取 refreshToken
        const authStorage = localStorage.getItem("auth-storage");
        if (!authStorage) throw new Error("No auth storage");

        const { state } = JSON.parse(authStorage);
        const refreshToken = state?.refreshToken;

        if (!refreshToken) throw new Error("No refresh token");

        // 调用刷新接口
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}/auth/refresh`,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data;

        // 更新存储
        localStorage.setItem("token", accessToken);
        const updatedStorage = {
          ...JSON.parse(authStorage),
          state: {
            ...state,
            accessToken,
            refreshToken: newRefreshToken,
          },
        };
        localStorage.setItem("auth-storage", JSON.stringify(updatedStorage));

        // 通知等待的请求
        onRefreshed(accessToken);
        isRefreshing = false;

        // 重试原始请求
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return request(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        // 刷新失败，清除登录状态
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  },
);

// ---- 通用请求方法（带类型） ----

/** GET 请求 */
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return request.get<T>(url, config);
}

/** POST 请求 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return request.post<T>(url, data, config);
}

/** PUT 请求 */
export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return request.put<T>(url, data, config);
}

/** PATCH 请求 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return request.patch<T>(url, data, config);
}

/** DELETE 请求 */
export async function del<T = void>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  return request.delete<T>(url, config);
}

export default request;
