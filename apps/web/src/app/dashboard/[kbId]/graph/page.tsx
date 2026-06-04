'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { knowledgeApi, type GraphData } from '@/lib/api';
import ReactECharts from 'echarts-for-react';

export default function GraphPage({ params }: { params: Promise<{ kbId: string }> }) {
  const { kbId } = use(params);
  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    knowledgeApi.getGraph(kbId).then((res) => setData(res.data));
  }, [kbId]);

  if (!data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">加载中...</div>;
  }

  if (!data.nodes.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <Link href={`/dashboard/${kbId}`} className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
        </header>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          还没有足够的文档和标签数据来生成知识图谱
        </div>
      </div>
    );
  }

  const option = {
    title: { text: '知识图谱', subtext: `节点=${data.nodes.length}  关系=${data.links.length}`, textStyle: { fontSize: 14 } },
    tooltip: { formatter: (p: { data?: { name?: string } }) => p.data?.name ?? '' },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      force: { repulsion: 200, edgeLength: [100, 300] },
      data: data.nodes,
      links: data.links.map((l) => ({ ...l, lineStyle: { width: l.value, opacity: 0.5 } })),
      label: { show: true, fontSize: 11, formatter: (p: { name: string }) => p.name },
      edgeSymbol: ['none', 'none'],
    }],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/dashboard/${kbId}`} className="text-sm text-gray-500 hover:text-gray-900">← 返回</Link>
        <h1 className="text-lg font-semibold">知识图谱</h1>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ReactECharts option={option} style={{ height: 580 }} />
        </div>
      </main>
    </div>
  );
}
