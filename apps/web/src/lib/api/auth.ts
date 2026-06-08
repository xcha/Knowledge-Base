import { post } from "../request";
import type { User } from "../types";

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    post<{ user: User; token: string }>("/auth/register", {
      email,
      password,
      name,
    }),

  login: (email: string, password: string) =>
    post<{ user: User; token: string }>("/auth/login", { email, password }),

  getCaptchaUrl: () =>
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}/auth/captcha?t=${Date.now()}`,

  sendSms: (phone: string, captchaId?: string, captchaAnswer?: string) =>
    post<{ success: boolean; message?: string }>("/auth/send-sms", {
      phone,
      captchaId,
      captchaAnswer,
    }),

  registerPhone: (phone: string, smsCode: string, password: string) =>
    post<{ user: User; token: string }>("/auth/register-phone", {
      phone,
      smsCode,
      password,
    }),
};
