import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

/**
 * 封装 Axios 实例：自动挂载 token、统一错误处理
 * 所有 API 方法都通过这个实例发请求
 */
const request = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  timeout: 30000,
});

// ---- 请求拦截：自动带 JWT ----
request.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 响应拦截：401 自动跳登录 ----
request.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("auth-storage");
      window.location.href = "/login";
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
