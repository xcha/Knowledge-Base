import { post } from "../request";
import type { User } from "../types";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  register: (email: string, password: string, name?: string, emailCode?: string) =>
    post<AuthResponse>("/auth/register", {
      email,
      password,
      name,
      emailCode: emailCode || undefined,
    }),

  login: (email: string, password: string) =>
    post<AuthResponse>("/auth/login", { email, password }),

  getCaptchaUrl: () =>
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}/auth/captcha?t=${Date.now()}`,

  sendSms: (phone: string, captchaId?: string, captchaAnswer?: string) =>
    post<{ success: boolean; message?: string }>("/auth/send-sms", {
      phone,
      captchaId,
      captchaAnswer,
    }),

  sendEmailCode: (email: string, captchaId?: string, captchaAnswer?: string) =>
    post<{ success: boolean; message?: string }>("/auth/send-email-code", {
      email,
      captchaId,
      captchaAnswer,
    }),

  registerPhone: (phone: string, smsCode: string, password: string) =>
    post<AuthResponse>("/auth/register-phone", {
      phone,
      smsCode: smsCode || undefined,
      password,
    }),

  refresh: (refreshToken: string) =>
    post<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      refreshToken,
    }),

  logout: (refreshToken: string) =>
    post<{ success: boolean }>("/auth/logout", { refreshToken }),
};
