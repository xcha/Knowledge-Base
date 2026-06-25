"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, type AdminOrder, type Pagination } from "@/lib/api/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loading } from "@/components/Loading";
import { Search, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders(
        page,
        20,
        status === "all" ? undefined : status,
        search || undefined,
      );
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleSearch() {
    setPage(1);
    await loadOrders();
  }

  async function handleManualPay(order: AdminOrder) {
    if (!confirm(`确认订单 ${order.outTradeNo} 已收到付款？`)) return;
    await adminApi.manualPayOrder(order.id);
    loadOrders();
  }

  async function handleCloseOrder(order: AdminOrder) {
    if (!confirm(`确定关闭订单 ${order.outTradeNo}？`)) return;
    await adminApi.closeOrder(order.id);
    loadOrders();
  }

  const statusBadge = (s: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "待支付", variant: "secondary" },
      paid: { label: "已支付", variant: "default" },
      closed: { label: "已关闭", variant: "outline" },
    };
    const c = config[s] || { label: s, variant: "outline" as const };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const membershipLabel = (m: string) => {
    const labels: Record<string, string> = {
      free: "免费版",
      basic: "基础版",
      pro: "高级版",
    };
    return labels[m] || m;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">订单管理</h1>
        <p className="text-muted-foreground">查看和管理所有支付订单</p>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-2">
        <Input
          placeholder="搜索订单号、用户邮箱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待支付</SelectItem>
            <SelectItem value="paid">已支付</SelectItem>
            <SelectItem value="closed">已关闭</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} variant="secondary">
          <Search className="size-4 mr-2" />
          搜索
        </Button>
      </div>

      {/* 订单表格 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8"><Loading /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.outTradeNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{order.user.email}</div>
                        {order.user.name && (
                          <div className="text-xs text-muted-foreground">
                            {order.user.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {membershipLabel(order.membership)} · {order.durationMonths}个月
                    </TableCell>
                    <TableCell className="font-medium">
                      ¥{order.totalAmount}
                    </TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {order.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => handleManualPay(order)}
                              title="手动确认支付"
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleCloseOrder(order)}
                              title="关闭订单"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
