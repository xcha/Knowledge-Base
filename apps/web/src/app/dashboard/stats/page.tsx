'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { userApi, type UserStatistics } from '@/lib/api';
import ReactECharts from 'echarts-for-react';

export default function StatsPage() {
  const [stats, setStats] = useState<UserStatistics | null>(null);

  useEffect(() => {
    userApi.getStatistics().then((res) => setStats(res.data));
  }, []);

  if (!stats) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">加载中...</div>;
  }

  // 折线图通用配置
  const lineOption = (title: string, data: { date: string; count: number }[]) => ({
    title: { text: title, textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category' as const, data: data.map((d) => d.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' as const, minInterval: 1 },
    series: [{ data: data.map((d) => d.count), type: 'line', smooth: true, areaStyle: { opacity: 0.15 } }],
  });

  // 饼图：知识库文档分布
  const pieOption = {
    title: { text: '知识库文档分布', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: stats.kbDistribution.map((kb) => ({ name: kb.name, value: kb.documents })),
      label: { formatter: '{b}\n{d}%' },
    }],
  };

  // 汇总卡片
  const cards = [
    { label: '知识库', value: stats.summary.totalKb, color: 'bg-blue-500' },
    { label: '文档', value: stats.summary.totalDocs, color: 'bg-green-500' },
    { label: '对话', value: stats.summary.totalSessions, color: 'bg-purple-500' },
    { label: '消息', value: stats.summary.totalMessages, color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
        <h1 className="text-lg font-semibold">数据看板</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* 汇总卡片 */}
        <div className="grid grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <div className={`inline-block w-3 h-3 rounded-full ${c.color} mb-2`} />
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>

        {/* 折线图 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <ReactECharts option={lineOption('知识库创建趋势（近30天）', stats.trends.knowledgeBases)} style={{ height: 280 }} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <ReactECharts option={lineOption('文档上传趋势（近30天）', stats.trends.documents)} style={{ height: 280 }} />
        </div>

        {/* 饼图 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <ReactECharts option={pieOption} style={{ height: 320 }} />
        </div>
      </main>
    </div>
  );
}
