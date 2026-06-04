'use client';

import { getErrorMessage } from "@/lib/error";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { paymentApi, userApi, type UserProfile, type PaymentOrder } from '@/lib/api';

const DURATION_LABELS: Record<number, string> = { 1: '月付', 3: '季付', 12: '年付' };
const MEMBERSHIP_CN: Record<string, string> = { free: '免费版', basic: '基础版', pro: '高级版' };

export default function MembershipPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prices, setPrices] = useState<Record<string, Record<string, number>> | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<string>('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [p, pricesRes, ordersRes] = await Promise.all([
      userApi.getProfile(),
      paymentApi.getPrices(),
      paymentApi.listOrders(),
    ]);
    setProfile(p.data);
    setPrices(pricesRes.data);
    setOrders(ordersRes.data);
  }

  async function handlePay() {
    if (!selectedPlan || paying) return;
    setPaying(true);
    setResult('');
    try {
      // 1. 创建订单
      const orderRes = await paymentApi.createOrder(selectedPlan, selectedDuration);
      const { outTradeNo, totalAmount } = orderRes.data;

      // 2. 沙箱模式：模拟支付（实际接入时跳支付宝收银台）
      setResult(`订单创建成功：${outTradeNo}，金额 ¥${totalAmount}`);

      // 模拟支付成功
      await new Promise((r) => setTimeout(r, 1000));
      const cbRes = await paymentApi.handleCallback(outTradeNo);
      setResult(
        `支付成功！已升级为 ${MEMBERSHIP_CN[cbRes.data.membership]}，到期日 ${new Date(cbRes.data.expiresAt).toLocaleDateString('zh-CN')}`,
      );

      // 刷新用户信息
      loadData();
    } catch (err: unknown) {
      setResult(getErrorMessage(err, '支付失败，请重试'));
    } finally {
      setPaying(false);
    }
  }

  if (!profile || !prices) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
        <h1 className="text-lg font-semibold">会员中心</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 当前会员状态 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-3">当前会员</h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              profile.membership === 'pro' ? 'bg-purple-100 text-purple-700'
              : profile.membership === 'basic' ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
            }`}>
              {MEMBERSHIP_CN[profile.membership] ?? profile.membership}
            </span>
            {profile.membershipExpiresAt && (
              <span className="text-sm text-gray-500">
                到期日：{new Date(profile.membershipExpiresAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
            <div>知识库：{profile._count.knowledgeBases} / {profile.maxKnowledgeBases}</div>
            <div>文档：{profile.usedDocuments} / {profile.maxDocuments}</div>
          </div>
        </div>

        {/* 套餐选择 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-4">升级方案</h2>

          {/* 会员等级切换 */}
          <div className="flex gap-2 mb-6">
            {['basic', 'pro'].map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  selectedPlan === plan
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {MEMBERSHIP_CN[plan]}
              </button>
            ))}
          </div>

          {/* 套餐功能对比 */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { label: '知识库数量', free: '3', basic: '10', pro: '50' },
              { label: '文档数量', free: '10', basic: '50', pro: '200' },
            ].map((row) => (
              <div key={row.label} className="text-sm">
                <p className="text-gray-500 mb-1">{row.label}</p>
                <p className="text-gray-300 line-through">{row.free}</p>
                <p className="text-blue-600 font-medium">{row[selectedPlan as keyof typeof row]}</p>
              </div>
            ))}
          </div>

          {/* 时长选择 */}
          <div className="flex gap-2 mb-6">
            {[1, 3, 12].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedDuration(m)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  selectedDuration === m
                    ? 'border-2 border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {DURATION_LABELS[m]}
                <span className="block text-xs text-gray-400">
                  ¥{prices[selectedPlan]?.[`month${m}`]}
                </span>
              </button>
            ))}
          </div>

          {/* 支付按钮 */}
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-base font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {paying
              ? '处理中...'
              : `¥${prices[selectedPlan]?.[`month${selectedDuration}`] ?? '--'} 立即支付`}
          </button>

          {result && (
            <p className={`mt-4 text-sm text-center ${result.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
              {result}
            </p>
          )}
        </div>

        {/* 订单记录 */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-3">订单记录</h2>
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-gray-700">{o.subject}</span>
                    <span className="text-gray-400 ml-2">{new Date(o.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 font-medium">¥{o.totalAmount}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {o.status === 'paid' ? '已支付' : '待支付'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
