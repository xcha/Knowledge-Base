'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';
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
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token }) },
  ),
);

/** 等待 zustand persist 从 localStorage 水合完毕后再渲染子组件 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // 如果还没水合完，手动触发一次
    if (!useAuthStore.persist.hasHydrated()) {
      useAuthStore.persist.rehydrate();
    }
    return () => { unsub(); unsubFinish(); };
  }, []);
  return hydrated;
}
