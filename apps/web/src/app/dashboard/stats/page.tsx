"use client";

import { useEffect, useState } from "react";
import { userApi, type UserStatistics } from "@/lib/api";
import ReactECharts from "echarts-for-react";
import { PageHeader } from "@/components/PageHeader";
import { Loading } from "@/components/Loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  FileText,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";

const ICONS = [BookOpen, FileText, MessageSquare, MessagesSquare];
const COLORS = [
  "text-blue-500",
  "text-green-500",
  "text-purple-500",
  "text-orange-500",
];

export default function StatsPage() {
  const [stats, setStats] = useState<UserStatistics | null>(null);

  useEffect(() => {
    userApi.getStatistics().then((res) => setStats(res.data));
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen bg-muted/30">
        <PageHeader title="数据看板" backHref="/dashboard" backLabel="返回" />
        <Loading />
      </div>
    );
  }

  const lineOption = (
    title: string,
    data: { date: string; count: number }[],
  ) => ({
    title: { text: title, textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" as const },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: "category" as const,
      data: data.map((d) => d.date.slice(5)),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: "value" as const, minInterval: 1 },
    series: [
      {
        data: data.map((d) => d.count),
        type: "line",
        smooth: true,
        areaStyle: { opacity: 0.15 },
      },
    ],
  });

  const pieOption = {
    title: { text: "知识库文档分布", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "item" as const },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        data: stats.kbDistribution.map((kb) => ({
          name: kb.name,
          value: kb.documents,
        })),
        label: { formatter: "{b}\n{d}%" },
      },
    ],
  };

  const summaryCards = [
    { label: "知识库", value: stats.summary.totalKb },
    { label: "文档", value: stats.summary.totalDocs },
    { label: "对话", value: stats.summary.totalSessions },
    { label: "消息", value: stats.summary.totalMessages },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="数据看板" backHref="/dashboard" backLabel="返回" />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((c, i) => {
            const Icon = ICONS[i];
            return (
              <Card key={c.label} className="card-hover">
                <CardContent className="p-5 text-center">
                  <div
                    className={`size-10 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                      i === 0
                        ? "bg-blue-50"
                        : i === 1
                          ? "bg-green-50"
                          : i === 2
                            ? "bg-purple-50"
                            : "bg-orange-50"
                    }`}
                  >
                    <Icon className={`size-5 ${COLORS[i]}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {c.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.label}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-5">
            <ReactECharts
              option={lineOption(
                "知识库创建趋势（近30天）",
                stats.trends.knowledgeBases,
              )}
              style={{ height: 280 }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <ReactECharts
              option={lineOption(
                "文档上传趋势（近30天）",
                stats.trends.documents,
              )}
              style={{ height: 280 }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <ReactECharts option={pieOption} style={{ height: 320 }} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
