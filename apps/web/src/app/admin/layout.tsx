"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { adminApi } from "@/lib/api/admin";
import { Loading } from "@/components/Loading";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "数据概览", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/orders", label: "订单管理", icon: ShoppingCart },
  { href: "/admin/settings", label: "系统设置", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 检查是否是初始化管理员页面
    if (pathname === "/admin/init") {
      setChecking(false);
      return;
    }

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // 检查管理员权限
    adminApi
      .getDashboard()
      .then(() => {
        setIsAdmin(true);
        setChecking(false);
      })
      .catch(() => {
        setIsAdmin(false);
        setChecking(false);
      });
  }, [user, pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // 初始化管理员页面
  if (pathname === "/admin/init") {
    return <>{children}</>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="size-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">无权访问</h1>
          <p className="text-muted-foreground">您没有管理员权限</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-primary hover:underline"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            <span className="text-lg font-bold">管理后台</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">
            {user?.email}
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full"
          >
            <LogOut className="size-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
