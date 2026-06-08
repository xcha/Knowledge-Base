'use client';

import { getErrorMessage } from "@/lib/error";
import { useEffect, useState } from 'react';
import { paymentApi, userApi, type UserProfile, type PaymentOrder } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Gem } from 'lucide-react';

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
      const orderRes = await paymentApi.createOrder(selectedPlan, selectedDuration);
      const { outTradeNo, totalAmount } = orderRes.data;
      setResult(`订单创建成功：${outTradeNo}，金额 ¥${totalAmount}`);
      await new Promise((r) => setTimeout(r, 1000));
      const cbRes = await paymentApi.handleCallback(outTradeNo);
      setResult(
        `支付成功！已升级为 ${MEMBERSHIP_CN[cbRes.data.membership]}，到期日 ${new Date(cbRes.data.expiresAt).toLocaleDateString('zh-CN')}`,
      );
      loadData();
    } catch (err: unknown) {
      setResult(getErrorMessage(err, '支付失败，请重试'));
    } finally {
      setPaying(false);
    }
  }

  if (!profile || !prices) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageHeader title="会员中心" backHref="/dashboard" backLabel="返回" />
        <Loading />
      </div>
    );
  }

  const badgeVariant = profile.membership === 'pro' ? 'default' : profile.membership === 'basic' ? 'secondary' : 'outline';

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="会员中心" backHref="/dashboard" backLabel="返回" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 当前会员状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">当前会员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={badgeVariant} className="text-sm px-3 py-1">
                <Gem className="size-3 mr-1" />
                {MEMBERSHIP_CN[profile.membership] ?? profile.membership}
              </Badge>
              {profile.membershipExpiresAt && (
                <span className="text-sm text-muted-foreground">
                  到期日：{new Date(profile.membershipExpiresAt).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>知识库：{profile._count.knowledgeBases} / {profile.maxKnowledgeBases}</div>
              <div>文档：{profile.usedDocuments} / {profile.maxDocuments}</div>
            </div>
          </CardContent>
        </Card>

        {/* 套餐选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">升级方案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ToggleGroup value={[selectedPlan]} onValueChange={(v: string[]) => { if (v.length > 0) setSelectedPlan(v[0]); }}
              className="justify-start">
              {['basic', 'pro'].map((plan) => (
                <ToggleGroupItem key={plan} value={plan} className="px-6">
                  {MEMBERSHIP_CN[plan]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '知识库数量', free: '3', basic: '10', pro: '50' },
                { label: '文档数量', free: '10', basic: '50', pro: '200' },
              ].map((row) => (
                <div key={row.label} className="text-sm">
                  <p className="text-muted-foreground mb-1">{row.label}</p>
                  <p className="text-muted-foreground/50 line-through">{row.free}</p>
                  <p className="text-primary font-medium">{row[selectedPlan as keyof typeof row]}</p>
                </div>
              ))}
            </div>

            <ToggleGroup value={[String(selectedDuration)]}
              onValueChange={(v: string[]) => { if (v.length > 0) setSelectedDuration(Number(v[0])); }}
              className="justify-start">
              {[1, 3, 12].map((m) => (
                <ToggleGroupItem key={m} value={String(m)} className="flex-col px-5">
                  <span>{DURATION_LABELS[m]}</span>
                  <span className="text-xs text-muted-foreground">¥{prices[selectedPlan]?.[`month${m}`]}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Button onClick={handlePay} disabled={paying} size="lg" className="w-full">
              {paying && <Loader2 className="size-4 animate-spin" />}
              {paying ? '处理中...' : `¥${prices[selectedPlan]?.[`month${selectedDuration}`] ?? '--'} 立即支付`}
            </Button>

            {result && (
              <p className={`text-sm text-center ${result.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>
                {result}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 订单记录 */}
        {orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">订单记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {orders.map((o) => (
                  <div key={o.id}>
                    <div className="flex items-center justify-between text-sm py-3">
                      <div>
                        <span className="text-foreground">{o.subject}</span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(o.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-medium">¥{o.totalAmount}</span>
                        <Badge variant={o.status === 'paid' ? 'default' : 'secondary'}>
                          {o.status === 'paid' ? '已支付' : '待支付'}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
