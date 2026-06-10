"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { User } from "./api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem("token", accessToken);
        set({ user, accessToken, refreshToken });
      },
      setAccessToken: (token) => {
        localStorage.setItem("token", token);
        set({ accessToken: token });
      },
      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    },
  ),
);

/**
 * 等待客户端挂载 + zustand persist 水合完毕
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
