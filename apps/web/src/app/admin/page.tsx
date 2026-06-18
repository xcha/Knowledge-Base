"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminDashboard } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/Loading";
import {
  Users,
  ShoppingCart,
  FileText,
  MessageSquare,
  TrendingUp,
  Database,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loading />;
  if (!data) return null;

  const stats = [
    {
      title: "总用户数",
      value: data.users.total,
      subtitle: `今日 +${data.users.today}，本月 +${data.users.thisMonth}`,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "总收入",
      value: `¥${data.orders.totalRevenue}`,
      subtitle: `本月 ${data.orders.thisMonth} 笔订单`,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      title: "知识库",
      value: data.content.knowledgeBases,
      subtitle: `${data.content.documents} 份文档`,
      icon: Database,
      color: "text-purple-500",
    },
    {
      title: "对话消息",
      value: data.content.messages,
      subtitle: `总订单 ${data.orders.total} 笔`,
      icon: MessageSquare,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">数据概览</h1>
        <p className="text-muted-foreground">系统运行状态一览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`size-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 会员分布 */}
      <Card>
        <CardHeader>
          <CardTitle>会员分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {data.membership.map((m) => (
              <div
                key={m.level}
                className="text-center p-4 bg-muted rounded-lg"
              >
                <div className="text-2xl font-bold">{m.count}</div>
                <div className="text-sm text-muted-foreground">
                  {m.level === "free"
                    ? "免费版"
                    : m.level === "basic"
                      ? "基础版"
                      : "高级版"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
