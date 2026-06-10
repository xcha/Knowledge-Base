"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { useAuthStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, Sparkles, MessageSquare, BarChart3 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 邮箱注册
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // 手机号注册
  const [phone, setPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const captchaRef = useRef<HTMLDivElement>(null);

  async function refreshCaptcha() {
    try {
      const url = authApi.getCaptchaUrl();
      const res = await fetch(url);
      const svg = await res.text();
      setCaptchaSvg(svg);
      setCaptchaId(res.headers.get("X-Captcha-Id") ?? "");
      setCaptchaInput("");
    } catch {
      setError("获取验证码失败");
    }
  }

  async function handleSendSms() {
    if (countdown > 0 || sendingSms) return;
    if (!phone) {
      setError("请输入手机号");
      return;
    }
    if (!captchaId || !captchaInput) {
      setError("请输入图片验证码");
      return;
    }

    setSendingSms(true);
    setError("");
    try {
      const res = await authApi.sendSms(phone, captchaId, captchaInput);
      if (res.data.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(res.data.message ?? "发送失败");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, '发送失败'));
    } finally {
      setSendingSms(false);
    }
  }

  async function emailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.register(email, emailPassword, name);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, '注册失败'));
    } finally {
      setLoading(false);
    }
  }

  async function phoneRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!phone) {
      setError("请输入手机号");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.registerPhone(phone, smsCode, phonePassword);
      setAuth(res.data.user, res.data.token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, '注册失败'));
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
              { icon: Sparkles, text: 'AI 智能问答，精准检索知识' },
              { icon: MessageSquare, text: '多轮对话，深度理解上下文' },
              { icon: BarChart3, text: '数据看板，洞察知识价值' },
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

      {/* Right - Register Form */}
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
            <h2 className="text-2xl font-bold text-foreground">创建账号</h2>
            <p className="text-muted-foreground mt-2">注册后开始使用 AI 知识库</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => { setTab(v as "email" | "phone"); setError(""); if (v === "phone") refreshCaptcha(); }}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="email" className="flex-1">邮箱注册</TabsTrigger>
              <TabsTrigger value="phone" className="flex-1">手机号注册</TabsTrigger>
            </TabsList>

            {tab === "email" ? (
              <form onSubmit={emailRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">昵称（可选）</Label>
                  <Input id="name" type="text" placeholder="你的昵称" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">邮箱</Label>
                  <Input id="reg-email" type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">密码</Label>
                  <Input id="reg-password" type="password" required minLength={6} placeholder="至少 6 位密码" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="h-11" />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? "注册中..." : "注册"}
                </Button>
              </form>
            ) : (
              <form onSubmit={phoneRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    maxLength={11}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="输入手机号"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="captcha">图片验证码</Label>
                  <div className="flex gap-2">
                    <Input
                      id="captcha"
                      type="text"
                      maxLength={4}
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="输入验证码"
                      className="flex-1 h-11"
                    />
                    <div
                      ref={captchaRef}
                      onClick={refreshCaptcha}
                      className="w-28 h-11 flex items-center justify-center bg-muted rounded-md cursor-pointer overflow-hidden shrink-0"
                      dangerouslySetInnerHTML={{
                        __html: captchaSvg || '<span class="text-xs text-muted-foreground">点击获取</span>',
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-code">短信验证码（可选）</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sms-code"
                      type="text"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="开发阶段可留空"
                      className="flex-1 h-11"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendSms}
                      disabled={sendingSms || countdown > 0}
                      className="w-28 shrink-0 h-11"
                    >
                      {countdown > 0 ? `${countdown}s` : sendingSms ? "发送中" : "获取验证码"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-password">密码</Label>
                  <Input
                    id="phone-password"
                    type="password"
                    required
                    minLength={6}
                    value={phonePassword}
                    onChange={(e) => setPhonePassword(e.target.value)}
                    placeholder="设置登录密码"
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
                  {loading ? "注册中..." : "注册"}
                </Button>
              </form>
            )}
          </Tabs>

          <p className="text-sm text-muted-foreground text-center mt-6">
            已有账号？{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
