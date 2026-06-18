"use client";

import { getErrorMessage } from "@/lib/error";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  BookOpen,
  Sparkles,
  MessageSquare,
  BarChart3,
  Users,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      // 登录后跳转到 redirect 参数指定的页面，默认跳转到 dashboard
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "登录失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-brand relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="size-6" />
            </div>
            <h1 className="text-2xl font-bold">AI 知识库</h1>
          </div>
          <p className="text-lg text-white/80 mb-12 max-w-md">
            基于 RAG 的智能知识库问答系统，让知识触手可及
          </p>
          <div className="space-y-6">
            {[
              { icon: Sparkles, text: "AI 智能问答，精准检索知识" },
              { icon: MessageSquare, text: "多轮对话，深度理解上下文" },
              { icon: BarChart3, text: "数据看板，洞察知识价值" },
              { icon: Users, text: "多人协作，团队赋能" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="size-9 bg-white/15 rounded-lg flex items-center justify-center">
                  <item.icon className="size-4" />
                </div>
                <span className="text-white/90">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-10 gradient-brand rounded-xl flex items-center justify-center">
              <BookOpen className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">AI 知识库</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">欢迎回来</h2>
            <p className="text-muted-foreground mt-2">登录你的账号继续使用</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            没有账号？{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
