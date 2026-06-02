'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type TabType = 'email' | 'phone';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState<TabType>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 邮箱注册
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // 手机号注册
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const captchaRef = useRef<HTMLDivElement>(null);

  // ---- 图片验证码 ----
  async function refreshCaptcha() {
    try {
      const url = authApi.getCaptchaUrl();
      const res = await fetch(url);
      const svg = await res.text();
      setCaptchaSvg(svg);
      setCaptchaId(res.headers.get('X-Captcha-Id') ?? '');
      setCaptchaInput('');
    } catch {
      setError('获取验证码失败');
    }
  }

  // ---- 发送短信 ----
  async function handleSendSms() {
    if (!captchaId) {
      await refreshCaptcha();
      return;
    }
    if (!captchaInput || !phone) {
      setError('请输入手机号和图片验证码');
      return;
    }
    if (countdown > 0) return;

    setSendingSms(true);
    setError('');
    try {
      const res = await authApi.sendSms(phone, captchaId, captchaInput);
      if (res.data.success) {
        // 倒计时 60 秒
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
        // 开发阶段后端直接返回验证码，预填给用户方便测试
        if (res.data.code) {
          setSmsCode(res.data.code);
          console.log('[DEV] 验证码:', res.data.code);
        }
      } else {
        setError(res.data.message ?? '发送失败');
        refreshCaptcha();
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? '发送失败');
      refreshCaptcha();
    } finally {
      setSendingSms(false);
    }
  }

  // ---- 邮箱注册 ----
  async function emailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register(email, emailPassword, name);
      setAuth(res.data.user, res.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? '注册失败');
    } finally {
      setLoading(false);
    }
  }

  // ---- 手机注册 ----
  async function phoneRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!smsCode) { setError('请输入短信验证码'); return; }
    setLoading(true);
    try {
      const res = await authApi.registerPhone(phone, smsCode, phonePassword);
      setAuth(res.data.user, res.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">注册</h1>

        {/* 注册方式 Tab */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab('email')}
            className={`flex-1 text-sm py-2 rounded-md transition ${
              tab === 'email' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            邮箱注册
          </button>
          <button
            onClick={() => { setTab('phone'); refreshCaptcha(); }}
            className={`flex-1 text-sm py-2 rounded-md transition ${
              tab === 'phone' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500'
            }`}
          >
            手机号注册
          </button>
        </div>

        {tab === 'email' ? (
          /* ---- 邮箱注册表单 ---- */
          <form onSubmit={emailRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称（可选）</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" required minLength={6} value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        ) : (
          /* ---- 手机号注册表单 ---- */
          <form onSubmit={phoneRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input type="tel" required maxLength={11} value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="输入手机号"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* 图片验证码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">图片验证码</label>
              <div className="flex gap-2">
                <input type="text" maxLength={4} value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="输入验证码"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div
                  ref={captchaRef}
                  onClick={refreshCaptcha}
                  className="w-28 h-10 flex items-center justify-center bg-gray-100 rounded cursor-pointer overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: captchaSvg || '<span class="text-xs text-gray-400">点击获取</span>' }}
                />
              </div>
            </div>

            {/* 短信验证码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">短信验证码</label>
              <div className="flex gap-2">
                <input type="text" maxLength={6} required value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="输入短信验证码"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={handleSendSms} disabled={sendingSms || countdown > 0}
                  className="w-28 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition">
                  {countdown > 0 ? `${countdown}s后重发` : sendingSms ? '发送中' : '获取验证码'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" required minLength={6} value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                placeholder="设置登录密码"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-gray-500 text-center">
          已有账号？<Link href="/login" className="text-blue-600 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
