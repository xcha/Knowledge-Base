'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSyncExternalStore } from 'react';
import type { User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  // persist 将 token 同步到 localStorage，刷新页面不丢失登录态
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token }) },
  ),
);

// 水合状态：SSR 时为 false，客户端挂载后为 true
let hydrated = false;
const hydrateCallbacks = new Set<() => void>();

function onHydrate(cb: () => void) {
  hydrateCallbacks.add(cb);
  return () => hydrateCallbacks.delete(cb);
}

function getSnapshot() {
  return hydrated;
}

// 客户端挂载时标记为已水合
if (typeof window !== 'undefined') {
  // persist 是同步恢复的，下一个 microtask 就能拿到数据
  queueMicrotask(() => {
    hydrated = true;
    hydrateCallbacks.forEach((cb) => cb());
  });
}

/** 等待客户端挂载 + zustand persist 水合完毕 */
export function useHydrated() {
  return useSyncExternalStore(onHydrate, getSnapshot, () => false);
}
