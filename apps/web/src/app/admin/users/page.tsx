"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, type AdminUser, type Pagination } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/Loading";
import {
  Search,
  Edit,
  Trash2,
  Key,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // 编辑用户弹窗
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
    membership: "",
    maxKnowledgeBases: 0,
    maxDocuments: 0,
  });

  // 重置密码弹窗
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(page, 20, search || undefined);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleSearch() {
    setPage(1);
    await loadUsers();
  }

  async function handleUpdateUser() {
    if (!editUser) return;
    await adminApi.updateUser(editUser.id, editForm);
    setEditUser(null);
    loadUsers();
  }

  async function handleDeleteUser(user: AdminUser) {
    if (!confirm(`确定要删除用户 ${user.email} 吗？此操作不可恢复。`)) return;
    await adminApi.deleteUser(user.id);
    loadUsers();
  }

  async function handleResetPassword() {
    if (!resetUser || !newPassword) return;
    await adminApi.resetPassword(resetUser.id, newPassword);
    setResetUser(null);
    setNewPassword("");
    alert("密码已重置");
  }

  function openEdit(user: AdminUser) {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      role: user.role,
      membership: user.membership,
      maxKnowledgeBases: user.maxKnowledgeBases,
      maxDocuments: user.maxDocuments,
    });
  }

  const membershipBadge = (m: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pro: "default",
      basic: "secondary",
      free: "outline",
    };
    const labels: Record<string, string> = {
      free: "免费版",
      basic: "基础版",
      pro: "高级版",
    };
    return <Badge variant={variants[m] || "outline"}>{labels[m] || m}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground">查看和管理所有用户</p>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <Input
          placeholder="搜索邮箱、昵称、手机号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-sm"
        />
        <Button onClick={handleSearch} variant="secondary">
          <Search className="size-4 mr-2" />
          搜索
        </Button>
      </div>

      {/* 用户表格 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8">
              <Loading />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>会员</TableHead>
                  <TableHead>知识库</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "outline"}
                      >
                        {user.role === "admin" ? "管理员" : "用户"}
                      </Badge>
                    </TableCell>
                    <TableCell>{membershipBadge(user.membership)}</TableCell>
                    <TableCell>{user._count.knowledgeBases}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(user)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setResetUser(user)}
                        >
                          <Key className="size-4" />
                        </Button>
                        {user.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
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
            共 {pagination.total} 条，第 {pagination.page}/
            {pagination.totalPages} 页
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

      {/* 编辑用户弹窗 */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>昵称</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>角色</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>会员等级</Label>
              <Select
                value={editForm.membership}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, membership: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">免费版</SelectItem>
                  <SelectItem value="basic">基础版</SelectItem>
                  <SelectItem value="pro">高级版</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>知识库上限</Label>
                <Input
                  type="number"
                  value={editForm.maxKnowledgeBases}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      maxKnowledgeBases: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>文档上限</Label>
                <Input
                  type="number"
                  value={editForm.maxDocuments}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      maxDocuments: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateUser}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={!!resetUser} onOpenChange={() => setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              为用户 <strong>{resetUser?.email}</strong> 设置新密码
            </p>
            <div>
              <Label>新密码</Label>
              <Input
                type="password"
                placeholder="至少 6 位"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>
              取消
            </Button>
            <Button onClick={handleResetPassword}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
