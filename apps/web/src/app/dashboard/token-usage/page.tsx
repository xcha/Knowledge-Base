'use client';

import { useEffect, useState } from 'react';
import { tokenUsageApi, type TokenUsageStats } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactECharts from 'echarts-for-react';
import { Coins, TrendingUp, Calendar, Activity } from 'lucide-react';

const membershipLabels: Record<string, string> = {
  free: '免费版',
  basic: '基础版',
  pro: '高级版',
};

export default function TokenUsagePage() {
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tokenUsageApi.getStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageHeader title="Token 用量" backHref="/dashboard" backLabel="返回" />
        <Loading />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageHeader title="Token 用量" backHref="/dashboard" backLabel="返回" />
        <div className="text-center py-16 text-muted-foreground text-sm">暂无数据</div>
      </div>
    );
  }

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const formatCost = (n: number) => {
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(3)}`;
    return `$${n.toFixed(4)}`;
  };

  const summaryCards = [
    { label: '今日用量', icon: Calendar, tokens: stats.today.totalTokens, cost: stats.today.estimatedCost, color: 'text-blue-600' },
    { label: '本月用量', icon: TrendingUp, tokens: stats.thisMonth.totalTokens, cost: stats.thisMonth.estimatedCost, color: 'text-purple-600' },
    { label: '累计用量', icon: Coins, tokens: stats.total.totalTokens, cost: stats.total.estimatedCost, color: 'text-amber-600' },
    { label: '总请求数', icon: Activity, tokens: stats.total.requests, cost: 0, color: 'text-green-600', isCount: true },
  ];

  // 每日用量柱状图
  const dailyChartOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: stats.daily.map((d) => d.date.slice(5)),
    },
    yAxis: {
      type: 'value' as const,
      name: 'Tokens',
      axisLabel: { formatter: (v: number) => formatTokens(v) },
    },
    series: [{
      type: 'bar' as const,
      data: stats.daily.map((d) => d.totalTokens),
      itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
    }],
    grid: { left: 60, right: 20, top: 30, bottom: 30 },
  };

  // 模型占比饼图
  const modelChartOption = stats.byModel.length > 0 ? {
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      data: stats.byModel.map((m) => ({
        name: m.model,
        value: m.totalTokens,
      })),
    }],
  } : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Token 用量" backHref="/dashboard" backLabel="返回" />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* 汇总卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-5 text-center">
                <card.icon className={`size-6 mx-auto mb-2 ${card.color}`} />
                <p className="text-2xl font-bold text-foreground">
                  {card.isCount ? card.tokens.toLocaleString() : formatTokens(card.tokens)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                {!card.isCount && card.cost > 0 && (
                  <p className="text-xs text-muted-foreground">≈ {formatCost(card.cost)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 本月用量进度条 */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  本月 Token 用量
                </p>
                <p className="text-xs text-muted-foreground">
                  {membershipLabels[stats.limit.membership]} · 每月 {formatTokens(stats.limit.limit)} 上限
                </p>
              </div>
              <Badge variant={stats.limit.used >= stats.limit.limit ? "destructive" : "secondary"}>
                {stats.limit.used >= stats.limit.limit ? "已用尽" : "正常"}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.limit.used >= stats.limit.limit
                    ? "bg-destructive"
                    : stats.limit.used >= stats.limit.limit * 0.8
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, (stats.limit.used / stats.limit.limit) * 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                已用 {formatTokens(stats.limit.used)}
              </p>
              <p className="text-xs text-muted-foreground">
                剩余 {formatTokens(Math.max(0, stats.limit.limit - stats.limit.used))}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 每日用量趋势 */}
        {stats.daily.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">每日用量趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactECharts option={dailyChartOption} style={{ height: 250 }} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 模型分布 */}
          {modelChartOption && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">模型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ReactECharts option={modelChartOption} style={{ height: 250 }} />
              </CardContent>
            </Card>
          )}

          {/* 各模型详情 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">模型详情</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byModel.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无使用记录</p>
              ) : (
                <div className="space-y-3">
                  {stats.byModel.map((m) => (
                    <div key={m.model} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1">{m.model}</Badge>
                        <p className="text-xs text-muted-foreground">{m.requests} 次请求</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTokens(m.totalTokens)}</p>
                        <p className="text-xs text-muted-foreground">≈ {formatCost(m.estimatedCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
