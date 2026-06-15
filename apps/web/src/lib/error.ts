import axios, { type AxiosError } from 'axios';

/** 从 Axios 错误中提取后端返回的 message，兼容兜底 */
export function getErrorMessage(err: unknown, fallback = '操作失败'): string {
  if (err instanceof Error && 'isAxiosError' in err) {
    const axiosErr = err as AxiosError<{ message?: string }>;
    return axiosErr.response?.data?.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
