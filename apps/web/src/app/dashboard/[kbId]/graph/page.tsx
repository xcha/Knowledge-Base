'use client';

import { useEffect, useState, use } from 'react';
import { knowledgeApi, type GraphData } from '@/lib/api';
import ReactECharts from 'echarts-for-react';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { Card, CardContent } from '@/components/ui/card';
import { Network } from 'lucide-react';

export default function GraphPage({ params }: { params: Promise<{ kbId: string }> }) {
  const { kbId } = use(params);
  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    knowledgeApi.getGraph(kbId).then((res) => setData(res.data));
  }, [kbId]);

  if (!data) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageHeader title="知识图谱" backHref={`/dashboard/${kbId}`} backLabel="返回" />
        <Loading />
      </div>
    );
  }

  if (!data.nodes.length) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageHeader title="知识图谱" backHref={`/dashboard/${kbId}`} backLabel="返回" />
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Network className="size-12 mb-3 opacity-50" />
          <p className="text-sm">还没有足够的文档和标签数据来生成知识图谱</p>
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
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="知识图谱" backHref={`/dashboard/${kbId}`} backLabel="返回" />
      <main className="max-w-5xl mx-auto px-6 py-6">
        <Card>
          <CardContent className="p-4">
            <ReactECharts option={option} style={{ height: 580 }} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
